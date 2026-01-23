import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ThinkingLevel, CustomModel, ModelOption, ApiProvider } from '../types';

interface ConfigState {
  planningLevel: ThinkingLevel;
  expertLevel: ThinkingLevel;
  synthesisLevel: ThinkingLevel;
  enableProcessStream: boolean;
  customModels: CustomModel[];
  selectedModel: ModelOption;
  apiProvider: ApiProvider;
  customApiKey: string;
  customBaseUrl: string;
  enableCustomApi: boolean;

  setConfig: (partial: Partial<ConfigState>) => void;
  addCustomModel: (model: CustomModel) => void;
  removeCustomModel: (id: string) => void;
  updateCustomModel: (id: string, updates: Partial<CustomModel>) => void;
  reset: () => void;
}

const DEFAULT_CONFIG = {
  planningLevel: 'high' as ThinkingLevel,
  expertLevel: 'high' as ThinkingLevel,
  synthesisLevel: 'high' as ThinkingLevel,
  enableProcessStream: true,
  customModels: [] as CustomModel[],
  selectedModel: 'gemini-3-flash-preview' as ModelOption,
  apiProvider: 'google' as ApiProvider,
  customApiKey: '',
  customBaseUrl: '',
  enableCustomApi: false,
};

export const useConfigStore = create<ConfigState>()(
  persist(
    (set) => ({
      ...DEFAULT_CONFIG,

      setConfig: (partial) => set(partial),
      
      addCustomModel: (model) =>
        set((state) => ({
          customModels: [...state.customModels, model],
        })),
      
      removeCustomModel: (id) =>
        set((state) => ({
          customModels: state.customModels.filter((m) => m.id !== id),
        })),
      
      updateCustomModel: (id, updates) =>
        set((state) => ({
          customModels: state.customModels.map((m) =>
            m.id === id ? { ...m, ...updates } : m
          ),
        })),
      
      reset: () => set(DEFAULT_CONFIG),
    }),
    { name: 'deepthink-config' }
  )
);
