import { ModelOption, ThinkingLevel, AppConfig, ApiProvider } from './types';

export const STORAGE_KEYS = {
  SETTINGS: 'deepthink-settings',
  MODEL: 'deepthink-selected-model',
  SESSION_ID: 'deepthink-active-session-id'
};

export const DEFAULT_CONFIG: AppConfig = {
  planningLevel: 'high',
  expertLevel: 'high',
  synthesisLevel: 'high',
  enableProcessStream: true,
  customModels: [],
  toolConfig: {
    enableWebSearch: false,
    webSearchProvider: 'auto',
    nativeWeb: false,
    maxSearchResults: 5
  }
};

export const getValidThinkingLevels = (model: ModelOption): ThinkingLevel[] => {
  if (model === 'gemini-3-pro-preview') {
    return ['low', 'high'];
  }
  if (model === 'o1-preview' || model === 'o1-mini') {
    return ['low', 'medium', 'high'];
  }
  return ['minimal', 'low', 'medium', 'high'];
};

export const getThinkingBudget = (level: ThinkingLevel, model: ModelOption): number => {
  const isGeminiPro = model === 'gemini-3-pro-preview';
  const isOpenAIReasoning = model === 'o1-preview' || model === 'o1-mini';

  switch (level) {
    case 'minimal': return 0;
    case 'low': return 2048;
    case 'medium': return 8192;
    case 'high':
      if (isOpenAIReasoning) return 65536;
      if (isGeminiPro) return 32768;
      return 16384;
    default: return 0;
  }
};


export const getAllModels = (config: AppConfig): { value: ModelOption; label: string; desc: string; provider: ApiProvider }[] => {
  return (config.customModels || []).map(m => ({
    value: m.name as ModelOption,
    label: m.name,
    desc: `${m.provider} model`,
    provider: m.provider
  }));
};

export const getModelConfig = (modelName: ModelOption, config: AppConfig): { provider: ApiProvider; apiKey?: string; baseUrl?: string } | null => {
  const customModel = (config.customModels || []).find(m => m.name === modelName);
  if (customModel) {
    return {
      provider: customModel.provider,
      apiKey: customModel.apiKey,
      baseUrl: customModel.baseUrl
    };
  }
  return null;
};

export const getBaseUrl = (provider: ApiProvider): string => {
  switch (provider) {
    case 'openai':
      return 'https://api.openai.com/v1';
    case 'anthropic':
      return 'https://api.anthropic.com/v1';
    case 'deepseek':
      return 'https://api.deepseek.com/v1';
    case 'xai':
      return 'https://api.x.ai/v1';
    case 'mistral':
      return 'https://api.mistral.ai/v1';
    case 'google':
      return 'https://generativelanguage.googleapis.com/v1beta';
    default:
      return '';
  }
};
