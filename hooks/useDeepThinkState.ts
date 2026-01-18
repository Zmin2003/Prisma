
import { useState, useRef, useCallback } from 'react';
import { AppState, AnalysisResult, ExpertResult, DegradationStatus, DeepThinkSnapshot, ModelOption, MessageAttachment, AppConfig } from '../types';
import { SnapshotManager } from '../services/snapshotManager';

export const useDeepThinkState = () => {
  const [appState, setAppState] = useState<AppState>('idle');
  const [managerAnalysis, setManagerAnalysis] = useState<AnalysisResult | null>(null);
  const [experts, setExperts] = useState<ExpertResult[]>([]);
  const [finalOutput, setFinalOutput] = useState('');
  const [synthesisThoughts, setSynthesisThoughts] = useState('');

  // Timing state
  const [processStartTime, setProcessStartTime] = useState<number | null>(null);
  const [processEndTime, setProcessEndTime] = useState<number | null>(null);

  // Degradation state
  const [degradationStatus, setDegradationStatus] = useState<DegradationStatus | null>(null);

  // Refs for data consistency
  const expertsDataRef = useRef<ExpertResult[]>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const resetDeepThink = useCallback(() => {
    setAppState('idle');
    setManagerAnalysis(null);
    setExperts([]);
    expertsDataRef.current = [];
    setFinalOutput('');
    setSynthesisThoughts('');
    setProcessStartTime(null);
    setProcessEndTime(null);
    setDegradationStatus(null);
    abortControllerRef.current = null;
  }, []);

  const stopDeepThink = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setAppState('idle');
    setProcessEndTime(Date.now());
  }, []);

  const updateExpertAt = useCallback((index: number, update: Partial<ExpertResult> | ((prev: ExpertResult) => ExpertResult)) => {
    const current = expertsDataRef.current[index];
    const next = typeof update === 'function' ? update(current) : { ...current, ...update };
    expertsDataRef.current[index] = next;
    setExperts([...expertsDataRef.current]);
  }, []);

  const setInitialExperts = useCallback((initialList: ExpertResult[]) => {
    expertsDataRef.current = initialList;
    setExperts(initialList);
  }, []);

  const appendExperts = useCallback((newList: ExpertResult[]) => {
    expertsDataRef.current = [...expertsDataRef.current, ...newList];
    setExperts([...expertsDataRef.current]);
  }, []);

  const createSnapshot = useCallback((
    sessionId: string,
    query: string,
    model: ModelOption,
    currentRound: number,
    recentHistory: string,
    attachments: MessageAttachment[],
    config: AppConfig
  ): string => {
    const snapshotId = `snapshot-${Date.now()}`;
    const snapshot: DeepThinkSnapshot = {
      id: snapshotId,
      timestamp: Date.now(),
      sessionId,
      query,
      model,
      appState,
      managerAnalysis,
      experts: expertsDataRef.current,
      finalOutput,
      synthesisThoughts,
      processStartTime,
      processEndTime,
      degradationStatus,
      currentRound,
      recentHistory,
      attachments,
      config
    };

    SnapshotManager.saveSnapshot(snapshot);
    return snapshotId;
  }, [appState, managerAnalysis, finalOutput, synthesisThoughts, processStartTime, processEndTime, degradationStatus]);

  const restoreSnapshot = useCallback((snapshot: DeepThinkSnapshot) => {
    setAppState(snapshot.appState);
    setManagerAnalysis(snapshot.managerAnalysis);
    expertsDataRef.current = snapshot.experts;
    setExperts(snapshot.experts);
    setFinalOutput(snapshot.finalOutput);
    setSynthesisThoughts(snapshot.synthesisThoughts);
    setProcessStartTime(snapshot.processStartTime);
    setProcessEndTime(snapshot.processEndTime);
    setDegradationStatus(snapshot.degradationStatus);
  }, []);

  return {
    appState, setAppState,
    managerAnalysis, setManagerAnalysis,
    experts, setExperts, expertsDataRef,
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
  };
};
