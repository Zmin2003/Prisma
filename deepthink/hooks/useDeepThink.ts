/**
 * useDeepThink Hook - 使用 Python 后端
 */

import { useCallback } from 'react';
import { connectWebSocket, streamChat, ChatMessage as ApiChatMessage } from '../api';
import { AppConfig, ModelOption, ExpertResult, ChatMessage } from '../types';
import { useDeepThinkState } from './useDeepThinkState';
import { logger } from '../services/logger';

const nodeToState: Record<string, 'idle' | 'analyzing' | 'experts_working' | 'reviewing' | 'synthesizing' | 'completed'> = {
  'start': 'analyzing',
  'planner': 'analyzing',
  'experts': 'experts_working',
  'critic': 'experts_working',
  'reviewer': 'reviewing',
  'synthesizer': 'synthesizing',
  'end': 'completed',
};

export const useDeepThink = () => {
  const {
    appState, setAppState,
    managerAnalysis, setManagerAnalysis,
    experts,
    finalOutput, setFinalOutput,
    synthesisThoughts, setSynthesisThoughts,
    processStartTime, setProcessStartTime,
    processEndTime, setProcessEndTime,
    abortControllerRef,
    resetDeepThink,
    stopDeepThink,
    setInitialExperts,
    appendExperts
  } = useDeepThinkState();

  const runDynamicDeepThink = useCallback(async (
    query: string, 
    history: ChatMessage[],
    model: ModelOption, 
    config: AppConfig
  ) => {
    if (!query.trim()) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    logger.info('System', 'Starting DeepThink via Backend', { model });

    resetDeepThink();
    setAppState('analyzing');
    setProcessStartTime(Date.now());

    const lastMessage = history[history.length - 1];
    const historyForContext = lastMessage && lastMessage.role === 'user' && lastMessage.content === query
      ? history.slice(0, -1)
      : history;

    const recentHistory = historyForContext.slice(-10).map(msg => 
      `${msg.role === 'user' ? 'User' : 'Model'}: ${msg.content}`
    ).join('\n');

    const toolConfig = config.toolConfig ? {
      enable_web_search: config.toolConfig.enableWebSearch,
      web_search_provider: config.toolConfig.webSearchProvider,
      max_search_results: config.toolConfig.maxSearchResults,
    } : undefined;

    const useWebSocket = config.enableProcessStream ?? true;

    const backendUrl = config.backendUrl;
    const appApiKey = config.appApiKey;

    const enableUpstreamOverride = config.enableCustomApi ?? false;
    const apiKey = enableUpstreamOverride ? config.customApiKey : undefined;
    const baseUrl = enableUpstreamOverride ? config.customBaseUrl : undefined;

    if (useWebSocket) {
      const closeWs = connectWebSocket(query, {
        onStateUpdate: (state) => {
          const newAppState = nodeToState[state.node];
          if (newAppState) {
            setAppState(newAppState);
          }
          
          if (state.node === 'planner' && state.status === 'completed' && state.data?.manager_analysis) {
            setManagerAnalysis({
              thought_process: state.data.manager_analysis.thought_process || '',
              experts: state.data.manager_analysis.experts || [],
            });
          }
          
          if (state.data?.synthesis_thoughts) {
            setSynthesisThoughts(state.data.synthesis_thoughts);
          }
          
          logger.debug('State', `Node: ${state.node}, Status: ${state.status}`);
        },
        onExpertUpdate: (expertList) => {
          const mapped: ExpertResult[] = expertList.map((e, idx) => ({
            id: e.id ?? `${e.role}-${e.round ?? 1}-${idx}`,
            role: e.role,
            description: e.description || '',
            temperature: e.temperature || 0.7,
            prompt: e.prompt || '',
            status: e.status || 'completed',
            content: e.content,
            thoughts: e.thoughts,
            round: e.round || 1,
          }));
          setInitialExperts(mapped);
        },
        onChunk: (content) => {
          setFinalOutput(content);
        },
        onComplete: (result) => {
          setFinalOutput(result.final_output);
          if (result.manager_analysis) {
            setManagerAnalysis({
              thought_process: result.manager_analysis.thought_process || '',
              experts: result.manager_analysis.experts || [],
            });
          }
          if (result.synthesis_thoughts) {
            setSynthesisThoughts(result.synthesis_thoughts);
          }
          setAppState('completed');
          setProcessEndTime(Date.now());
          logger.info('System', 'DeepThink completed', { rounds: result.rounds });
        },
        onError: (error) => {
          logger.error('System', 'DeepThink error', error);
          setAppState('idle');
          setProcessEndTime(Date.now());
        },
      }, {
        backendUrl,
        appApiKey,
        context: recentHistory,
        maxRounds: 8,
        model,
        apiKey,
        baseUrl,
        planningLevel: config.planningLevel,
        expertLevel: config.expertLevel,
        synthesisLevel: config.synthesisLevel,
        toolConfig,
      });

      abortControllerRef.current.signal.addEventListener('abort', () => {
        closeWs();
      });
    } else {
      const messages: ApiChatMessage[] = historyForContext.map(msg => ({
        role: msg.role === 'model' ? 'assistant' : 'user',
        content: msg.content,
      }));
      messages.push({ role: 'user', content: query });

      setAppState('experts_working');

      let accumulated = '';
      await streamChat(messages, {
        onChunk: (content) => {
          accumulated += content;
          setFinalOutput(accumulated);
        },
        onComplete: (result) => {
          setFinalOutput(result.final_output);
          setAppState('completed');
          setProcessEndTime(Date.now());
        },
        onError: (error) => {
          logger.error('System', 'Stream error', error);
          setAppState('idle');
          setProcessEndTime(Date.now());
        },
      }, {
        backendUrl,
        appApiKey,
        signal,
        model,
        apiKey,
        baseUrl,
        maxRounds: 8,
        planningLevel: config.planningLevel,
        expertLevel: config.expertLevel,
        synthesisLevel: config.synthesisLevel,
        toolConfig,
      });
    }
  }, [
    abortControllerRef, resetDeepThink, setAppState, setProcessStartTime,
    setFinalOutput, setInitialExperts, setProcessEndTime, setSynthesisThoughts
  ]);

  return {
    appState,
    managerAnalysis,
    experts,
    finalOutput,
    synthesisThoughts,
    runDynamicDeepThink,
    stopDeepThink,
    resetDeepThink,
    processStartTime,
    processEndTime
  };
};
