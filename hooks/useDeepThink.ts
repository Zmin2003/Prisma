
import { useCallback, useRef } from 'react';
import { getAI, getAIProvider, findCustomModel } from '../api';
import { getThinkingBudget, RETRY_CONFIG, DEGRADATION_CONFIG } from '../config';
import { AppConfig, ModelOption, ExpertResult, ChatMessage, MessageAttachment, TimeoutError, RetryStatus, DegradationLevel, DegradationReason } from '../types';

import { executeManagerAnalysis, executeManagerReview } from '../services/deepThink/manager';
import { streamExpertResponse } from '../services/deepThink/expert';
import { streamSynthesisResponse } from '../services/deepThink/synthesis';
import { useDeepThinkState } from './useDeepThinkState';
import { logger } from '../services/logger';
import { withRetry, classifyError } from '../services/utils/retry';
import { performanceMonitor } from '../services/performanceMonitor';
import { validateFullConfig, mapToUISeverity } from '../services/validationService';
import { errorService } from '../services/errorService';

export const useDeepThink = () => {
  const {
    appState, setAppState,
    managerAnalysis, setManagerAnalysis,
    experts, expertsDataRef,
    finalOutput, setFinalOutput,
    synthesisThoughts, setSynthesisThoughts,
    processStartTime, setProcessStartTime,
    processEndTime, setProcessEndTime,
    degradationStatus, setDegradationStatus,
    abortControllerRef,
    resetDeepThink,
    stopDeepThink,
    updateExpertAt,
    setInitialExperts,
    appendExperts,
    createSnapshot,
    restoreSnapshot
  } = useDeepThinkState();

  // Degradation tracking
  const errorCountRef = useRef({ timeout: 0, retry: 0, api: 0, network: 0 });
  const currentDegradationRef = useRef<DegradationLevel>('full');

  // Snapshot tracking
  const currentSessionIdRef = useRef<string>('');
  const currentQueryRef = useRef<string>('');
  const currentModelRef = useRef<ModelOption>('gemini-3-flash-preview');
  const currentConfigRef = useRef<AppConfig | null>(null);
  const currentRoundRef = useRef<number>(1);
  const recentHistoryRef = useRef<string>('');
  const attachmentsRef = useRef<MessageAttachment[]>([]);

  // Performance tracking
  const managerStartTimeRef = useRef<number>(0);
  const expertsStartTimeRef = useRef<number>(0);
  const synthesisStartTimeRef = useRef<number>(0);

  /**
   * Degradation decision logic
   */
  const decideDegradation = useCallback((error?: Error): DegradationLevel => {
    const { timeout, retry, api, network } = errorCountRef.current;
    const { TRIGGERS } = DEGRADATION_CONFIG;

    // Track error type
    if (error) {
      if (error instanceof TimeoutError) {
        errorCountRef.current.timeout++;
      } else {
        const errorType = classifyError(error);
        if (errorType === 'network') errorCountRef.current.network++;
        else if (errorType === 'api') errorCountRef.current.api++;
      }
    }

    // Degradation decision tree
    const totalErrors = timeout + retry + api + network;

    if (timeout >= TRIGGERS.TIMEOUT_THRESHOLD || retry >= TRIGGERS.RETRY_FAILURE_THRESHOLD) {
      // Critical failures - degrade to direct
      return 'direct';
    } else if (totalErrors >= 3) {
      // Multiple errors - degrade to single expert
      return 'single';
    } else if (totalErrors >= 2) {
      // Some errors - degrade to simplified
      return 'simplified';
    }

    return currentDegradationRef.current;
  }, []);

  /**
   * Apply degradation
   */
  const applyDegradation = useCallback((level: DegradationLevel, reason: DegradationReason) => {
    const previousLevel = currentDegradationRef.current;
    currentDegradationRef.current = level;

    setDegradationStatus({
      level,
      reason,
      triggeredAt: Date.now(),
      originalLevel: previousLevel
    });

    logger.warn('Degradation', `Degraded from ${previousLevel} to ${level}`, { reason });
  }, [setDegradationStatus]);

  /**
   * Record performance metrics
   */
  const recordPerformanceMetric = useCallback(() => {
    const processStart = processStartTime;
    const processEnd = Date.now();

    if (!processStart) return;

    const experts = expertsDataRef.current;
    const expertSuccessCount = experts.filter(e => e.status === 'completed').length;
    const expertFailureCount = experts.filter(e => e.status === 'error').length;
    const expertTimeoutCount = experts.filter(e => e.status === 'timeout').length;

    const managerDuration = managerStartTimeRef.current > 0
      ? (expertsStartTimeRef.current || processEnd) - managerStartTimeRef.current
      : undefined;

    const expertsDuration = expertsStartTimeRef.current > 0
      ? (synthesisStartTimeRef.current || processEnd) - expertsStartTimeRef.current
      : undefined;

    const synthesisDuration = synthesisStartTimeRef.current > 0
      ? processEnd - synthesisStartTimeRef.current
      : undefined;

    const status = expertFailureCount === experts.length ? 'failed'
      : expertSuccessCount === 0 ? 'failed'
      : expertSuccessCount < experts.length ? 'partial'
      : 'success';

    performanceMonitor.recordMetric({
      id: `metric-${Date.now()}`,
      timestamp: processStart,
      sessionId: currentSessionIdRef.current,
      query: currentQueryRef.current,
      model: currentModelRef.current,
      totalDuration: processEnd - processStart,
      managerDuration,
      expertsDuration,
      synthesisDuration,
      expertCount: experts.length,
      expertSuccessCount,
      expertFailureCount,
      expertTimeoutCount,
      degradationLevel: currentDegradationRef.current,
      degradationTriggered: degradationStatus !== null,
      errorCount: Object.values(errorCountRef.current).reduce((a, b) => a + b, 0),
      retryCount: errorCountRef.current.retry,
      status
    });
  }, [processStartTime, degradationStatus]);

  /**
   * Create snapshot at key points
   */
  const saveProgressSnapshot = useCallback(() => {
    if (!currentConfigRef.current || !currentSessionIdRef.current) return;

    try {
      const snapshotId = createSnapshot(
        currentSessionIdRef.current,
        currentQueryRef.current,
        currentModelRef.current,
        currentRoundRef.current,
        recentHistoryRef.current,
        attachmentsRef.current,
        currentConfigRef.current
      );
      logger.info('Snapshot', `Progress snapshot created: ${snapshotId}`);
    } catch (error) {
      logger.error('Snapshot', 'Failed to create progress snapshot', error);
    }
  }, [createSnapshot]);

  /**
   * Orchestrates a single expert's lifecycle (Start -> Stream -> End)
   */
  const runExpertLifecycle = async (
    expert: ExpertResult,
    globalIndex: number,
    ai: any,
    model: ModelOption,
    context: string,
    attachments: MessageAttachment[],
    budget: number,
    signal: AbortSignal
  ): Promise<ExpertResult> => {
    if (signal.aborted) return expert;

    logger.info('Expert', `Starting expert: ${expert.role}`, { id: expert.id, round: expert.round });
    const startTime = Date.now();
    updateExpertAt(globalIndex, { status: 'thinking', startTime });

    try {
      let fullContent = "";
      let fullThoughts = "";

      await withRetry(
        async () => {
          await streamExpertResponse(
            ai,
            model,
            expert,
            context,
            attachments,
            budget,
            signal,
            (textChunk, thoughtChunk) => {
              fullContent += textChunk;
              fullThoughts += thoughtChunk;
              updateExpertAt(globalIndex, { thoughts: fullThoughts, content: fullContent });
            }
          );
        },
        RETRY_CONFIG.API_ERROR.maxRetries,
        RETRY_CONFIG.API_ERROR.initialDelay,
        RETRY_CONFIG.API_ERROR.backoffMultiplier,
        (status) => {
          updateExpertAt(globalIndex, {
            status: 'retrying',
            retryStatus: {
              isRetrying: true,
              attempt: status.attempt,
              maxRetries: status.maxRetries,
              errorType: status.errorType,
              nextRetryDelay: status.nextRetryDelay
            }
          });
          logger.info('Expert', `${expert.role} retry attempt ${status.attempt}/${status.maxRetries}`, status);
        }
      );
      
      if (signal.aborted) {
         logger.warn('Expert', `Expert aborted: ${expert.role}`);
         return expertsDataRef.current[globalIndex];
      }

      logger.info('Expert', `Expert completed: ${expert.role}`);
      updateExpertAt(globalIndex, { status: 'completed', endTime: Date.now() });
      return expertsDataRef.current[globalIndex];

    } catch (error) {
       console.error(`Expert ${expert.role} error:`, error);
       logger.error('Expert', `Expert failed: ${expert.role}`, error);
       if (!signal.aborted) {
           if (error instanceof TimeoutError) {
               updateExpertAt(globalIndex, { 
                 status: 'timeout', 
                 content: `Expert timed out after ${error.timeoutMs}ms. Please try again or reduce thinking budget.`,
                 errorMessage: error.message,
                 endTime: Date.now() 
               });
           } else {
               updateExpertAt(globalIndex, { status: 'error', content: "Failed to generate response.", endTime: Date.now() });
           }
       }
       return expertsDataRef.current[globalIndex];
    }
  };

  /**
   * Direct response mode (no DeepThink)
   */
  const runDirectMode = async (
    ai: any,
    model: ModelOption,
    query: string,
    recentHistory: string,
    attachments: MessageAttachment[],
    budget: number,
    signal: AbortSignal
  ) => {
    setAppState('synthesizing');
    logger.info('Degradation', 'Running in direct mode');

    let fullText = '';
    let fullThoughts = '';

    await streamSynthesisResponse(
      ai, model, query, recentHistory, [],
      attachments, budget, signal,
      (textChunk, thoughtChunk) => {
        fullText += textChunk;
        fullThoughts += thoughtChunk;
        setFinalOutput(fullText);
        setSynthesisThoughts(fullThoughts);
      }
    );
  };

  /**
   * Main Orchestration logic
   */
  const runDynamicDeepThink = async (
    query: string,
    history: ChatMessage[],
    model: ModelOption,
    config: AppConfig,
    sessionId?: string
  ) => {
    if (!query.trim() && (!history.length || !history[history.length - 1].attachments?.length)) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    logger.info('System', 'Starting DeepThink Process', { model, provider: getAIProvider(model, config.customModels) });

    // Store context for snapshots
    currentSessionIdRef.current = sessionId || `session-${Date.now()}`;
    currentQueryRef.current = query;
    currentModelRef.current = model;
    currentConfigRef.current = config;
    currentRoundRef.current = 1;

    // Reset UI state and degradation tracking
    setAppState('analyzing');
    setManagerAnalysis(null);
    setInitialExperts([]);
    setFinalOutput('');
    setSynthesisThoughts('');
    setProcessStartTime(Date.now());
    setProcessEndTime(null);
    setDegradationStatus(null);
    errorCountRef.current = { timeout: 0, retry: 0, api: 0, network: 0 };
    currentDegradationRef.current = 'full' as DegradationLevel;

    // Pre-validation gate: validate config before API call
    const validationResult = validateFullConfig(model, config);
    if (!validationResult.isValid) {
      logger.error('Validation', 'Pre-execution validation failed', validationResult.errors);

      // Report errors to error service for UI display
      validationResult.errors.forEach(err => {
        const severity = mapToUISeverity(err);
        errorService.report({
          category: 'Config',
          severity: severity === 'card' ? 'critical' : 'high',
          message: err.message,
          code: err.code,
          userMessage: err.message,
          actionable: true,
          suggestedAction: err.suggestedAction,
          timestamp: Date.now()
        });
      });

      // Abort execution
      setAppState('idle');
      setProcessEndTime(Date.now());
      return;
    }

    // Log warnings but continue
    validationResult.warnings.forEach(warn => {
      logger.warn('Validation', warn.message, { code: warn.code });
    });

    const customModelConfig = findCustomModel(model, config.customModels);
    const provider = customModelConfig?.provider || getAIProvider(model, config.customModels);

    const ai = getAI({
      provider,
      apiKey: customModelConfig?.apiKey || config.customApiKey,
      baseUrl: customModelConfig?.baseUrl || config.customBaseUrl
    });

    try {
      // Get the last message (which is the user's current query) to retrieve attachments
      const lastMessage = history[history.length - 1];
      const currentAttachments = lastMessage.role === 'user' ? (lastMessage.attachments || []) : [];

      const recentHistory = history.slice(0, -1).slice(-5).map(msg =>
        `${msg.role === 'user' ? 'User' : 'Model'}: ${msg.content}`
      ).join('\n');

      // Store for snapshots
      recentHistoryRef.current = recentHistory;
      attachmentsRef.current = currentAttachments;

      // --- Phase 1: Planning & Initial Experts ---
      logger.debug('Manager', 'Phase 1: Planning started');

      const degradationLevel: DegradationLevel = currentDegradationRef.current;
      const levelConfig = DEGRADATION_CONFIG.LEVELS[degradationLevel];

      // Check if we should run in direct mode
      if (degradationLevel === 'direct') {
        logger.info('Degradation', 'Running in direct mode - skipping DeepThink');
        await runDirectMode(ai, model, query, recentHistory, currentAttachments,
          getThinkingBudget(config.synthesisLevel, model), signal);

        if (!signal.aborted) {
          setAppState('completed');
          setProcessEndTime(Date.now());
        }
        return;
      }

      // Manager analysis (skip for single expert mode)
      let analysisJson: any = null;
      if (levelConfig.enableManager) {
        try {
          const managerTask = executeManagerAnalysis(
            ai, model, query, recentHistory, currentAttachments,
            getThinkingBudget(config.planningLevel, model)
          );
          analysisJson = await managerTask;
          if (signal.aborted) return;
          setManagerAnalysis(analysisJson);
          logger.info('Manager', 'Plan generated', analysisJson);

          // Save snapshot after manager analysis
          saveProgressSnapshot();
        } catch (error) {
          logger.error('Manager', 'Analysis failed', error);
          const newLevel = decideDegradation(error as Error);
          if (newLevel !== degradationLevel) {
            applyDegradation(newLevel, error instanceof TimeoutError ? 'timeout' : 'api_error');
            // Retry with degraded level
            return runDynamicDeepThink(query, history, model, config);
          }
        }
      }

      // Primary expert
      const primaryExpert: ExpertResult = {
        id: 'expert-0',
        role: "Primary Responder",
        description: "Directly addresses the user's original query.",
        temperature: 1,
        prompt: query,
        status: 'pending',
        round: 1
      };

      setInitialExperts([primaryExpert]);

      const primaryTask = runExpertLifecycle(
        primaryExpert, 0, ai, model, recentHistory, currentAttachments,
        getThinkingBudget(config.expertLevel, model), signal
      );

      await primaryTask;
      if (signal.aborted) return;

      // Save snapshot after primary expert
      saveProgressSnapshot();

      // Supplementary experts (limited by degradation level)
      const round1Experts: ExpertResult[] = [];
      if (analysisJson && analysisJson.experts && levelConfig.maxExperts > 1) {
        const maxSupplementary = levelConfig.maxExperts - 1;
        const supplementaryExperts = analysisJson.experts.slice(0, maxSupplementary).map((exp: any, idx: number) => ({
          ...exp,
          id: `expert-r1-${idx + 1}`,
          status: 'pending' as const,
          round: 1
        }));
        round1Experts.push(...supplementaryExperts);
      }

      if (round1Experts.length > 0) {
        appendExperts(round1Experts);
        setAppState('experts_working');

        const round1Tasks = round1Experts.map((exp, idx) =>
          runExpertLifecycle(exp, idx + 1, ai, model, recentHistory, currentAttachments,
            getThinkingBudget(config.expertLevel, model), signal)
        );

        await Promise.all(round1Tasks);
        if (signal.aborted) return;

        // Save snapshot after round 1 experts
        saveProgressSnapshot();
      }

      // --- Phase 2: Recursive Loop (Optional) ---
      let roundCounter = 1;
      const MAX_ROUNDS = 3;
      let loopActive = (config.enableRecursiveLoop ?? false) && levelConfig.enableRecursiveLoop;

      while (loopActive && roundCounter < MAX_ROUNDS) {
          if (signal.aborted) return;
          logger.info('Manager', `Phase 2: Reviewing Round ${roundCounter}`);
          setAppState('reviewing');
          
          const reviewResult = await executeManagerReview(
            ai, model, query, expertsDataRef.current,
            getThinkingBudget(config.planningLevel, model)
          );

          if (signal.aborted) return;
          
          logger.info('Manager', `Review Result: ${reviewResult.satisfied ? 'Satisfied' : 'Not Satisfied'}`, reviewResult);
          
          if (reviewResult.satisfied) {
            loopActive = false;
          } else {
             roundCounter++;
             currentRoundRef.current = roundCounter;
             const nextRoundExperts = (reviewResult.refined_experts || []).map((exp, idx) => ({
                ...exp, id: `expert-r${roundCounter}-${idx}`, status: 'pending' as const, round: roundCounter
             }));

             if (nextRoundExperts.length === 0) {
                 logger.warn('Manager', 'Not satisfied but no new experts proposed. Breaking loop.');
                 loopActive = false;
                 break;
             }

             const startIndex = expertsDataRef.current.length;
             appendExperts(nextRoundExperts);
             setAppState('experts_working');

             const nextRoundTasks = nextRoundExperts.map((exp, idx) => 
                runExpertLifecycle(exp, startIndex + idx, ai, model, recentHistory, currentAttachments,
                   getThinkingBudget(config.expertLevel, model), signal)
             );

             await Promise.all(nextRoundTasks);

             // Save snapshot after each recursive round
             saveProgressSnapshot();
          }
      }

      if (signal.aborted) return;

      // --- Phase 3: Synthesis ---
      if (levelConfig.enableSynthesis) {
        setAppState('synthesizing');
        logger.info('Synthesis', 'Phase 3: Synthesis started');

        let fullFinalText = '';
        let fullFinalThoughts = '';

        try {
          await streamSynthesisResponse(
            ai, model, query, recentHistory, expertsDataRef.current,
            currentAttachments,
            getThinkingBudget(config.synthesisLevel, model), signal,
            (textChunk, thoughtChunk) => {
                fullFinalText += textChunk;
                fullFinalThoughts += thoughtChunk;
                setFinalOutput(fullFinalText);
                setSynthesisThoughts(fullFinalThoughts);
            }
          );

          if (!signal.aborted) {
            logger.info('Synthesis', 'Response generation completed');
            setAppState('completed');
            setProcessEndTime(Date.now());

            // Save final snapshot
            saveProgressSnapshot();
          }
        } catch (synthError) {
          if (synthError instanceof TimeoutError) {
            logger.error('Synthesis', `Synthesis timed out after ${synthError.timeoutMs}ms`);
            const newLevel = decideDegradation(synthError);
            if (newLevel !== degradationLevel) {
              applyDegradation(newLevel, 'timeout');
              return runDynamicDeepThink(query, history, model, config);
            }
            setFinalOutput(`Synthesis timed out after ${synthError.timeoutMs}ms. The expert analysis is available above, but the final synthesis could not be completed. Please try again with a lower thinking budget.`);
            setAppState('completed');
            setProcessEndTime(Date.now());
          } else {
            throw synthError;
          }
        }
      } else {
        // No synthesis - use primary expert output directly
        const primaryExpertOutput = expertsDataRef.current[0]?.content || '';
        setFinalOutput(primaryExpertOutput);
        setAppState('completed');
        setProcessEndTime(Date.now());
      }

    } catch (e: any) {
      if (!signal.aborted) {
        console.error(e);
        logger.error('System', 'DeepThink Process Error', e);
        setAppState('idle');
        setProcessEndTime(Date.now());
      } else {
        logger.warn('System', 'Process aborted by user');
      }
    } finally {
       abortControllerRef.current = null;
    }
  };

  /**
   * Resume from snapshot
   */
  const resumeFromSnapshot = useCallback(async (
    snapshotId: string,
    history: ChatMessage[],
    model: ModelOption,
    config: AppConfig
  ) => {
    const { SnapshotManager } = await import('../services/snapshotManager');
    const snapshot = SnapshotManager.loadSnapshot(snapshotId);

    if (!snapshot) {
      logger.error('Snapshot', `Cannot resume: snapshot ${snapshotId} not found`);
      return false;
    }

    logger.info('Snapshot', `Resuming from snapshot ${snapshotId}`, {
      state: snapshot.appState,
      round: snapshot.currentRound
    });

    // Restore state
    restoreSnapshot(snapshot);

    // Restore context refs
    currentSessionIdRef.current = snapshot.sessionId;
    currentQueryRef.current = snapshot.query;
    currentModelRef.current = snapshot.model;
    currentConfigRef.current = snapshot.config;
    currentRoundRef.current = snapshot.currentRound;
    recentHistoryRef.current = snapshot.recentHistory;
    attachmentsRef.current = snapshot.attachments;

    // Continue execution from where it left off
    // Note: This is a simplified resume - full implementation would need
    // to determine exact phase and continue from there
    logger.info('Snapshot', 'State restored, ready to continue');
    return true;
  }, [restoreSnapshot]);

  return {
    appState,
    managerAnalysis,
    experts,
    finalOutput,
    synthesisThoughts,
    degradationStatus,
    runDynamicDeepThink,
    stopDeepThink,
    resetDeepThink,
    resumeFromSnapshot,
    processStartTime,
    processEndTime
  };
};
