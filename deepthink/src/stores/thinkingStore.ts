import { create } from 'zustand';
import type { AppState, AnalysisResult, ExpertResult } from '../types';

interface ThinkingState {
  appState: AppState;
  managerAnalysis: AnalysisResult | null;
  experts: ExpertResult[];
  finalOutput: string;
  synthesisThoughts: string;
  processStartTime: number | null;
  processEndTime: number | null;
  currentRound: number;

  setAppState: (state: AppState) => void;
  setManagerAnalysis: (analysis: AnalysisResult | null) => void;
  setExperts: (experts: ExpertResult[]) => void;
  updateExpert: (id: string, updates: Partial<ExpertResult>) => void;
  setFinalOutput: (output: string) => void;
  appendFinalOutput: (chunk: string) => void;
  setSynthesisThoughts: (thoughts: string) => void;
  startProcess: () => void;
  endProcess: () => void;
  incrementRound: () => void;
  reset: () => void;
}

const INITIAL_STATE = {
  appState: 'idle' as AppState,
  managerAnalysis: null,
  experts: [] as ExpertResult[],
  finalOutput: '',
  synthesisThoughts: '',
  processStartTime: null as number | null,
  processEndTime: null as number | null,
  currentRound: 0,
};

export const useThinkingStore = create<ThinkingState>()((set) => ({
  ...INITIAL_STATE,

  setAppState: (appState) => set({ appState }),
  
  setManagerAnalysis: (managerAnalysis) => set({ managerAnalysis }),
  
  setExperts: (experts) => set({ experts }),
  
  updateExpert: (id, updates) =>
    set((state) => ({
      experts: state.experts.map((e) =>
        e.id === id ? { ...e, ...updates } : e
      ),
    })),
  
  setFinalOutput: (finalOutput) => set({ finalOutput }),
  
  appendFinalOutput: (chunk) =>
    set((state) => ({ finalOutput: state.finalOutput + chunk })),
  
  setSynthesisThoughts: (synthesisThoughts) => set({ synthesisThoughts }),
  
  startProcess: () =>
    set({
      processStartTime: Date.now(),
      processEndTime: null,
      appState: 'analyzing',
      currentRound: 1,
    }),
  
  endProcess: () =>
    set({
      processEndTime: Date.now(),
      appState: 'completed',
    }),
  
  incrementRound: () =>
    set((state) => ({ currentRound: state.currentRound + 1 })),
  
  reset: () => set(INITIAL_STATE),
}));
