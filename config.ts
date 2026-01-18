
import { ModelOption, ThinkingLevel, AppConfig, ApiProvider } from './types';

export const MODELS: { value: ModelOption; label: string; desc: string; provider: ApiProvider }[] = [
  {
    value: 'gemini-3-flash-preview',
    label: 'Gemini 3 Flash',
    desc: 'Low latency, high throughput, dynamic thinking.',
    provider: 'google'
  },
  {
    value: 'gemini-3-pro-preview',
    label: 'Gemini 3 Pro',
    desc: 'Deep reasoning, complex tasks, higher intelligence.',
    provider: 'google'
  },
  {
    value: 'custom',
    label: 'Custom Model',
    desc: 'Use any OpenAI-compatible API (LM Studio, Ollama, LocalAI, etc.) by configuring custom base URL.',
    provider: 'custom'
  },
];

export const STORAGE_KEYS = {
  SETTINGS: 'prisma-settings',
  MODEL: 'prisma-selected-model',
  SESSION_ID: 'prisma-active-session-id',
  SNAPSHOTS: 'prisma-deepthink-snapshots'
};

export const DEFAULT_CONFIG: AppConfig = {
  planningLevel: 'high',
  expertLevel: 'high',
  synthesisLevel: 'high',
  customApiKey: '',
  customBaseUrl: '',
  enableCustomApi: false,
  enableRecursiveLoop: false,
  apiProvider: 'google',
  customModels: []
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

export const getProvider = (model: ModelOption): ApiProvider => {
  const modelInfo = MODELS.find(m => m.value === model);
  return modelInfo?.provider || 'google';
};

export const getAllModels = (config: AppConfig): { value: ModelOption; label: string; desc: string; provider: ApiProvider }[] => {
  const presetModels = MODELS.filter(m => m.value !== 'custom');

  const customModels = (config.customModels || []).map(m => ({
    value: m.name as ModelOption,
    label: m.name,
    desc: `Custom ${m.provider} model`,
    provider: m.provider
  }));

  return [...presetModels, ...customModels];
};

export interface ApiKeyValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateApiKey = (apiKey: string, provider: ApiProvider): ApiKeyValidationResult => {
  if (!apiKey || apiKey.trim() === '') {
    return { isValid: false, error: 'API Key cannot be empty' };
  }

  const trimmedKey = apiKey.trim();

  switch (provider) {
    case 'google':
      if (!trimmedKey.startsWith('AIza')) {
        return { isValid: false, error: 'Gemini API Key must start with "AIza"' };
      }
      if (trimmedKey.length !== 39) {
        return { isValid: false, error: 'Gemini API Key must be 39 characters long' };
      }
      break;

    case 'openai':
      if (!trimmedKey.startsWith('sk-')) {
        return { isValid: false, error: 'OpenAI API Key must start with "sk-"' };
      }
      if (trimmedKey.length < 40) {
        return { isValid: false, error: 'OpenAI API Key appears too short' };
      }
      break;

    case 'anthropic':
      if (!trimmedKey.startsWith('sk-ant-')) {
        return { isValid: false, error: 'Anthropic API Key must start with "sk-ant-"' };
      }
      break;

    case 'deepseek':
      if (!trimmedKey.startsWith('sk-')) {
        return { isValid: false, error: 'DeepSeek API Key must start with "sk-"' };
      }
      break;

    case 'xai':
      if (!trimmedKey.startsWith('xai-')) {
        return { isValid: false, error: 'xAI API Key must start with "xai-"' };
      }
      break;

    case 'mistral':
      if (trimmedKey.length < 32) {
        return { isValid: false, error: 'Mistral API Key appears too short' };
      }
      break;

    case 'custom':
      break;

    default:
      break;
  }

  return { isValid: true };
};

export const validateBaseUrl = (baseUrl: string): ApiKeyValidationResult => {
  if (!baseUrl || baseUrl.trim() === '') {
    return { isValid: false, error: 'Base URL cannot be empty' };
  }

  const trimmedUrl = baseUrl.trim();

  try {
    const url = new URL(trimmedUrl);
    if (!url.protocol.startsWith('http')) {
      return { isValid: false, error: 'Base URL must use HTTP or HTTPS protocol' };
    }
  } catch (e) {
    return { isValid: false, error: 'Invalid URL format' };
  }

  return { isValid: true };
};

export const DEEPTHINK_TIMEOUTS = {
  MANAGER: 60000,
  EXPERT: 30000,
  SYNTHESIS: 45000
} as const;

export const RETRY_CONFIG = {
  NETWORK_ERROR: {
    maxRetries: 3,
    initialDelay: 1500,
    backoffMultiplier: 2
  },
  API_ERROR: {
    maxRetries: 2,
    initialDelay: 1000,
    backoffMultiplier: 2
  }
} as const;

export const DEGRADATION_CONFIG = {
  TRIGGERS: {
    TIMEOUT_THRESHOLD: 2,
    RETRY_FAILURE_THRESHOLD: 2,
    ERROR_RATE_THRESHOLD: 0.5
  },
  LEVELS: {
    full: {
      name: 'Full Mode',
      description: 'Complete DeepThink: Manager → Multiple Experts → Synthesis',
      enableManager: true,
      maxExperts: 5,
      enableSynthesis: true,
      enableRecursiveLoop: true
    },
    simplified: {
      name: 'Simplified Mode',
      description: 'Simplified: Manager → Limited Experts → Synthesis',
      enableManager: true,
      maxExperts: 2,
      enableSynthesis: true,
      enableRecursiveLoop: false
    },
    single: {
      name: 'Single Expert Mode',
      description: 'Single Expert: Primary Expert Only → Synthesis',
      enableManager: false,
      maxExperts: 1,
      enableSynthesis: true,
      enableRecursiveLoop: false
    },
    direct: {
      name: 'Direct Mode',
      description: 'Direct Response: No DeepThink Processing',
      enableManager: false,
      maxExperts: 0,
      enableSynthesis: false,
      enableRecursiveLoop: false
    }
  }
} as const;
