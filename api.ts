
import { GoogleGenAI } from "@google/genai";
import OpenAI from "openai";
import { ApiProvider, CustomModel } from './types';
import { logger } from './services/logger';

type AIProviderConfig = {
  provider?: ApiProvider;
  apiKey?: string;
  baseUrl?: string;
};

export const findCustomModel = (modelName: string, customModels?: CustomModel[]): CustomModel | undefined => {
  return customModels?.find(m => m.name === modelName);
};

// External API base URLs for production
const PROVIDER_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  deepseek: 'https://api.deepseek.com/v1',
  anthropic: 'https://api.anthropic.com/v1',
  xai: 'https://api.x.ai/v1',
  mistral: 'https://api.mistral.ai/v1',
  custom: '',
};

// Check if we're in development mode
const isDevelopment = typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'development';

// Store the current custom API target URL and Gemini proxy base URL
let currentCustomApiUrl: string | null = null;
let geminiProxyBaseUrl: string | null = null;

// Setup unified fetch interceptor
const originalFetch = typeof window !== 'undefined' ? window.fetch.bind(window) : null;

// Helper function to safely apply fetch interceptor
const applyFetch = (fn: typeof window.fetch) => {
  try {
    Object.defineProperty(window, 'fetch', {
      value: fn,
      configurable: true,
      writable: true,
      enumerable: true
    });
  } catch (e) {
    try {
      (window as any).fetch = fn;
    } catch (err) {
      console.error('[API] Critical: Failed to intercept fetch.', err);
      logger.error('System', 'Failed to intercept fetch', err);
    }
  }
};

// Unified fetch interceptor combining custom API proxy and Gemini proxy
if (typeof window !== 'undefined' && originalFetch) {
  const unifiedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    let urlString: string;
    if (typeof input === 'string') {
      urlString = input;
    } else if (input instanceof URL) {
      urlString = input.toString();
    } else {
      urlString = input.url;
    }

    // Handle custom API proxy with X-Target-URL header
    if (urlString.includes('/custom-api') && currentCustomApiUrl) {
      const headers = new Headers(init?.headers);
      headers.set('X-Target-URL', currentCustomApiUrl);

      logger.debug('API', 'Using Custom Proxy', { target: currentCustomApiUrl, path: urlString });

      return originalFetch(input, {
        ...init,
        headers,
      });
    }

    // Handle Gemini API proxy redirection
    const defaultGeminiHost = 'generativelanguage.googleapis.com';
    if (geminiProxyBaseUrl && urlString.includes(defaultGeminiHost)) {
      try {
        const url = new URL(urlString);
        const proxy = new URL(geminiProxyBaseUrl);

        url.protocol = proxy.protocol;
        url.host = proxy.host;

        if (proxy.pathname !== '/') {
          const cleanPath = proxy.pathname.endsWith('/') ? proxy.pathname.slice(0, -1) : proxy.pathname;
          url.pathname = cleanPath + url.pathname;
        }

        const newUrl = url.toString();
        logger.debug('API', 'Redirecting Gemini request', { original: urlString, redirected: newUrl });

        if (input instanceof Request) {
          const requestData: RequestInit = {
            method: input.method,
            headers: input.headers,
            body: input.body,
            mode: input.mode,
            credentials: input.credentials,
            cache: input.cache,
            redirect: input.redirect,
            referrer: input.referrer,
            integrity: input.integrity,
          };

          const mergedInit = { ...requestData, ...init };
          return originalFetch(new URL(newUrl), mergedInit);
        }

        return originalFetch(newUrl, init);
      } catch (e) {
        console.error('[API] Failed to redirect Gemini request:', e);
        logger.error('API', 'Failed to redirect Gemini request', e);
      }
    }

    return originalFetch(input, init);
  };

  applyFetch(unifiedFetch);
  logger.info('System', 'Unified fetch interceptor installed');
}

// Public API to set Gemini proxy base URL (replaces interceptor.ts functionality)
export const setGeminiProxyUrl = (baseUrl: string | null) => {
  if (!baseUrl) {
    geminiProxyBaseUrl = null;
    logger.info('API', 'Gemini proxy disabled');
    return;
  }

  let normalizedBase = baseUrl.trim();
  try {
    new URL(normalizedBase);
  } catch (e) {
    console.warn('[API] Invalid Gemini proxy URL provided:', normalizedBase);
    logger.warn('API', 'Invalid Gemini proxy URL', { url: normalizedBase });
    return;
  }

  if (normalizedBase.endsWith('/')) {
    normalizedBase = normalizedBase.slice(0, -1);
  }

  geminiProxyBaseUrl = normalizedBase;
  logger.info('API', 'Gemini proxy URL set', { url: normalizedBase });
};

export const getAI = (config?: AIProviderConfig) => {
  const provider = config?.provider || 'google';
  const apiKey = config?.apiKey || (typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GEMINI_API_KEY : undefined);

  if (provider === 'openai' || provider === 'deepseek' || provider === 'custom' || provider === 'anthropic' || provider === 'xai' || provider === 'mistral') {
    const options: any = {
      apiKey: apiKey,
      dangerouslyAllowBrowser: true,
    };

    if (config?.baseUrl) {
      // Custom baseUrl from Configuration UI
      if (isDevelopment) {
        // Store the target URL for the fetch interceptor
        currentCustomApiUrl = config.baseUrl;
        // Use proxy path
        options.baseURL = `${window.location.origin}/custom-api`;
      } else {
        // In production, use the URL directly
        options.baseURL = config.baseUrl;
      }
    } else {
      const providerBaseUrl = PROVIDER_BASE_URLS[provider];
      if (providerBaseUrl) {
        if (isDevelopment) {
          // In development, use proxy to avoid CORS for known providers
          options.baseURL = `${window.location.origin}/${provider}/v1`;
        } else {
          options.baseURL = providerBaseUrl;
        }
      }
    }

    logger.info('API', 'Initializing OpenAI Client', { 
      provider, 
      baseURL: options.baseURL,
      isCustom: provider === 'custom'
    });
    
    return new OpenAI(options);
  } else {
    const options: any = {
      apiKey: apiKey,
    };

    if (config?.baseUrl) {
      options.baseUrl = config.baseUrl;
    }

    logger.info('API', 'Initializing Google GenAI Client');
    return new GoogleGenAI(options);
  }
};

export const getAIProvider = (model: string, customModels?: CustomModel[]): ApiProvider => {
  // Priority 1: Check custom models array first
  // This fixes the bug where custom models default to 'google' provider
  if (customModels && customModels.length > 0) {
    const customModel = findCustomModel(model, customModels);
    if (customModel) {
      logger.debug('API', 'Custom model provider resolved', { model, provider: customModel.provider });
      return customModel.provider;
    }
  }

  // Priority 2: Check model name prefixes for known providers
  if (model.startsWith('gpt-') || model.startsWith('o1-')) {
    return 'openai';
  }
  if (model.startsWith('deepseek-')) {
    return 'deepseek';
  }
  if (model.startsWith('claude-')) {
    return 'anthropic';
  }
  if (model.startsWith('grok-')) {
    return 'xai';
  }
  if (model.startsWith('mistral-') || model.startsWith('mixtral-')) {
    return 'mistral';
  }
  if (model === 'custom') {
    return 'custom';
  }

  // Priority 3: Default to google for Gemini models
  return 'google';
};

export interface TestConnectionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export const testApiConnection = async (
  provider: ApiProvider,
  apiKey: string,
  baseUrl?: string
): Promise<TestConnectionResult> => {
  try {
    logger.info('API', 'Testing connection', { provider, hasBaseUrl: !!baseUrl });

    if (provider === 'google') {
      const ai = getAI({ provider, apiKey, baseUrl }) as any;

      await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { role: 'user', parts: [{ text: 'test' }] },
      });

      logger.info('API', 'Connection test successful', { provider });
      return { success: true, message: 'Connection successful' };
    } else {
      const ai = getAI({ provider, apiKey, baseUrl }) as OpenAI;

      await ai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'test' }],
        max_tokens: 5,
      });

      logger.info('API', 'Connection test successful', { provider });
      return { success: true, message: 'Connection successful' };
    }
  } catch (error: any) {
    logger.error('API', 'Connection test failed', { provider, error });

    let errorMessage = 'Connection failed';

    if (error?.message) {
      if (error.message.includes('API key')) {
        errorMessage = 'Invalid API Key. Please check your key and try again.';
      } else if (error.message.includes('quota') || error.message.includes('limit')) {
        errorMessage = 'API quota exceeded. Please check your account limits.';
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (error.message.includes('timeout')) {
        errorMessage = 'Connection timeout. Please try again.';
      } else if (error.message.includes('model')) {
        errorMessage = 'Model not available. Please check your API access.';
      } else {
        errorMessage = `Connection failed: ${error.message}`;
      }
    }

    return { success: false, error: errorMessage };
  }
};
