import { ThinkingLevel, AppConfig } from './types';

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

  backendUrl: '',

  appApiKey: '',
  rememberAppApiKey: false,

  enableCustomApi: false,
  customApiKey: '',
  rememberCustomApiKey: false,
  customBaseUrl: '',

  toolConfig: {
    enableWebSearch: false,
    webSearchProvider: 'auto',
    maxSearchResults: 5
  }
};

export const getValidThinkingLevels = (): ThinkingLevel[] => {
  return ['minimal', 'low', 'medium', 'high'];
};

export const getThinkingBudget = (level: ThinkingLevel): number => {
  switch (level) {
    case 'minimal': return 0;
    case 'low': return 2048;
    case 'medium': return 8192;
    case 'high': return 16384;
    default: return 0;
  }
};
