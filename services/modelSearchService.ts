
import { ApiProvider } from '../types';
import { logger } from './logger';

// ============================================================================
// Types
// ============================================================================

export interface ModelInfo {
  id: string;
  name: string;
  provider: ApiProvider;
  description?: string;
  contextWindow?: number;
  maxOutput?: number;
  capabilities?: string[];
  pricing?: {
    input: number;  // per 1M tokens
    output: number; // per 1M tokens
  };
  releaseDate?: string;
  isNew?: boolean;
  isFeatured?: boolean;
}

export interface ModelSearchResult {
  models: ModelInfo[];
  source: 'builtin' | 'api' | 'mixed';
  totalCount: number;
  query?: string;
}

export type ModelCategory = 'all' | 'chat' | 'code' | 'vision' | 'reasoning';

// ============================================================================
// Built-in Model Registry
// ============================================================================

export const MODEL_REGISTRY: ModelInfo[] = [
  // Google Models
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro',
    provider: 'google',
    description: 'Most capable Gemini model for complex reasoning tasks',
    contextWindow: 1000000,
    maxOutput: 8192,
    capabilities: ['chat', 'code', 'vision', 'reasoning'],
    isFeatured: true,
    isNew: true
  },
  {
    id: 'gemini-3-flash-preview',
    name: 'Gemini 3 Flash',
    provider: 'google',
    description: 'Fast and efficient for everyday tasks',
    contextWindow: 1000000,
    maxOutput: 8192,
    capabilities: ['chat', 'code', 'vision'],
    isFeatured: true
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    provider: 'google',
    description: 'Advanced reasoning with thinking capabilities',
    contextWindow: 1000000,
    maxOutput: 65536,
    capabilities: ['chat', 'code', 'vision', 'reasoning'],
    isNew: true
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    provider: 'google',
    description: 'Fast model with adaptive thinking',
    contextWindow: 1000000,
    maxOutput: 65536,
    capabilities: ['chat', 'code', 'vision']
  },
  {
    id: 'gemini-2.0-flash',
    name: 'Gemini 2.0 Flash',
    provider: 'google',
    description: 'Balanced performance and speed',
    contextWindow: 1000000,
    maxOutput: 8192,
    capabilities: ['chat', 'code', 'vision']
  },

  // OpenAI Models
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    provider: 'openai',
    description: 'Most capable GPT-4 model with vision',
    contextWindow: 128000,
    maxOutput: 16384,
    capabilities: ['chat', 'code', 'vision'],
    isFeatured: true
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    provider: 'openai',
    description: 'Affordable and fast GPT-4 variant',
    contextWindow: 128000,
    maxOutput: 16384,
    capabilities: ['chat', 'code', 'vision']
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    provider: 'openai',
    description: 'High performance with vision capabilities',
    contextWindow: 128000,
    maxOutput: 4096,
    capabilities: ['chat', 'code', 'vision']
  },
  {
    id: 'o1-preview',
    name: 'o1 Preview',
    provider: 'openai',
    description: 'Advanced reasoning model',
    contextWindow: 128000,
    maxOutput: 32768,
    capabilities: ['chat', 'code', 'reasoning'],
    isNew: true
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    provider: 'openai',
    description: 'Fast reasoning model',
    contextWindow: 128000,
    maxOutput: 65536,
    capabilities: ['chat', 'code', 'reasoning']
  },

  // Anthropic Models
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    provider: 'anthropic',
    description: 'Latest Claude with enhanced capabilities',
    contextWindow: 200000,
    maxOutput: 8192,
    capabilities: ['chat', 'code', 'vision', 'reasoning'],
    isFeatured: true,
    isNew: true
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    provider: 'anthropic',
    description: 'Most powerful Claude model',
    contextWindow: 200000,
    maxOutput: 8192,
    capabilities: ['chat', 'code', 'vision', 'reasoning'],
    isNew: true
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    description: 'Balanced performance and intelligence',
    contextWindow: 200000,
    maxOutput: 8192,
    capabilities: ['chat', 'code', 'vision']
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    description: 'Fast and efficient',
    contextWindow: 200000,
    maxOutput: 8192,
    capabilities: ['chat', 'code']
  },

  // DeepSeek Models
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat',
    provider: 'deepseek',
    description: 'General purpose chat model',
    contextWindow: 64000,
    maxOutput: 8192,
    capabilities: ['chat', 'code']
  },
  {
    id: 'deepseek-coder',
    name: 'DeepSeek Coder',
    provider: 'deepseek',
    description: 'Specialized for coding tasks',
    contextWindow: 64000,
    maxOutput: 8192,
    capabilities: ['code'],
    isFeatured: true
  },
  {
    id: 'deepseek-reasoner',
    name: 'DeepSeek Reasoner',
    provider: 'deepseek',
    description: 'Advanced reasoning capabilities',
    contextWindow: 64000,
    maxOutput: 8192,
    capabilities: ['chat', 'reasoning'],
    isNew: true
  },

  // xAI Models
  {
    id: 'grok-2',
    name: 'Grok 2',
    provider: 'xai',
    description: 'Latest Grok model with real-time knowledge',
    contextWindow: 131072,
    maxOutput: 8192,
    capabilities: ['chat', 'code'],
    isNew: true
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta',
    provider: 'xai',
    description: 'Experimental Grok features',
    contextWindow: 131072,
    maxOutput: 8192,
    capabilities: ['chat', 'code']
  },

  // Mistral Models
  {
    id: 'mistral-large-latest',
    name: 'Mistral Large',
    provider: 'mistral',
    description: 'Most capable Mistral model',
    contextWindow: 128000,
    maxOutput: 8192,
    capabilities: ['chat', 'code'],
    isFeatured: true
  },
  {
    id: 'mistral-medium-latest',
    name: 'Mistral Medium',
    provider: 'mistral',
    description: 'Balanced performance',
    contextWindow: 32000,
    maxOutput: 8192,
    capabilities: ['chat', 'code']
  },
  {
    id: 'mistral-small-latest',
    name: 'Mistral Small',
    provider: 'mistral',
    description: 'Fast and efficient',
    contextWindow: 32000,
    maxOutput: 8192,
    capabilities: ['chat', 'code']
  },
  {
    id: 'codestral-latest',
    name: 'Codestral',
    provider: 'mistral',
    description: 'Specialized for code generation',
    contextWindow: 32000,
    maxOutput: 8192,
    capabilities: ['code'],
    isNew: true
  },
  {
    id: 'mixtral-8x7b-instruct',
    name: 'Mixtral 8x7B',
    provider: 'mistral',
    description: 'Mixture of experts model',
    contextWindow: 32000,
    maxOutput: 8192,
    capabilities: ['chat', 'code']
  }
];

// ============================================================================
// Search Functions
// ============================================================================

/**
 * Search models in the built-in registry
 */
export function searchBuiltinModels(
  query?: string,
  options?: {
    provider?: ApiProvider;
    category?: ModelCategory;
    limit?: number;
    featuredOnly?: boolean;
    newOnly?: boolean;
  }
): ModelSearchResult {
  let results = [...MODEL_REGISTRY];

  // Filter by provider
  if (options?.provider) {
    results = results.filter(m => m.provider === options.provider);
  }

  // Filter by category/capability
  if (options?.category && options.category !== 'all') {
    results = results.filter(m => m.capabilities?.includes(options.category!));
  }

  // Filter featured only
  if (options?.featuredOnly) {
    results = results.filter(m => m.isFeatured);
  }

  // Filter new only
  if (options?.newOnly) {
    results = results.filter(m => m.isNew);
  }

  // Search by query
  if (query && query.trim()) {
    const searchTerm = query.toLowerCase().trim();
    results = results.filter(m =>
      m.id.toLowerCase().includes(searchTerm) ||
      m.name.toLowerCase().includes(searchTerm) ||
      m.description?.toLowerCase().includes(searchTerm) ||
      m.provider.toLowerCase().includes(searchTerm)
    );
  }

  // Sort: featured first, then new, then alphabetically
  results.sort((a, b) => {
    if (a.isFeatured && !b.isFeatured) return -1;
    if (!a.isFeatured && b.isFeatured) return 1;
    if (a.isNew && !b.isNew) return -1;
    if (!a.isNew && b.isNew) return 1;
    return a.name.localeCompare(b.name);
  });

  // Apply limit
  const totalCount = results.length;
  if (options?.limit && options.limit > 0) {
    results = results.slice(0, options.limit);
  }

  logger.debug('ModelSearch', 'Built-in search completed', {
    query,
    resultCount: results.length,
    totalCount
  });

  return {
    models: results,
    source: 'builtin',
    totalCount,
    query
  };
}

/**
 * Get model by ID from registry
 */
export function getModelById(modelId: string): ModelInfo | undefined {
  return MODEL_REGISTRY.find(m => m.id === modelId);
}

/**
 * Get all models for a specific provider
 */
export function getModelsByProvider(provider: ApiProvider): ModelInfo[] {
  return MODEL_REGISTRY.filter(m => m.provider === provider);
}

/**
 * Get featured models
 */
export function getFeaturedModels(): ModelInfo[] {
  return MODEL_REGISTRY.filter(m => m.isFeatured);
}

/**
 * Get new models
 */
export function getNewModels(): ModelInfo[] {
  return MODEL_REGISTRY.filter(m => m.isNew);
}

/**
 * Get all unique providers from registry
 */
export function getAvailableProviders(): ApiProvider[] {
  const providers = new Set(MODEL_REGISTRY.map(m => m.provider));
  return Array.from(providers);
}

/**
 * Get all unique capabilities from registry
 */
export function getAvailableCapabilities(): string[] {
  const capabilities = new Set<string>();
  MODEL_REGISTRY.forEach(m => {
    m.capabilities?.forEach(c => capabilities.add(c));
  });
  return Array.from(capabilities);
}

// ============================================================================
// External API Search (Tavily Integration)
// ============================================================================

export interface ExternalSearchConfig {
  apiKey: string;
  baseUrl?: string;
}

export interface TavilySearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

/**
 * Search for AI models using Tavily API
 */
export async function searchExternalModels(
  query: string,
  config: ExternalSearchConfig
): Promise<ModelSearchResult> {
  if (!config.apiKey) {
    logger.warn('ModelSearch', 'Tavily API key not configured');
    return {
      models: [],
      source: 'api',
      totalCount: 0,
      query
    };
  }

  const baseUrl = config.baseUrl || 'https://api.tavily.com';

  try {
    logger.debug('ModelSearch', 'Searching external API', { query });

    const response = await fetch(`${baseUrl}/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: config.apiKey,
        query: `AI language model ${query} API specifications capabilities`,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        max_results: 10,
        include_domains: [
          'openai.com',
          'anthropic.com',
          'ai.google.dev',
          'deepseek.com',
          'mistral.ai',
          'x.ai',
          'huggingface.co'
        ]
      })
    });

    if (!response.ok) {
      throw new Error(`Tavily API error: ${response.status}`);
    }

    const data = await response.json();
    const results: TavilySearchResult[] = data.results || [];

    // Parse results into ModelInfo format
    const models: ModelInfo[] = results
      .map(result => parseExternalResult(result))
      .filter((m): m is ModelInfo => m !== null);

    logger.info('ModelSearch', 'External search completed', {
      query,
      resultCount: models.length
    });

    return {
      models,
      source: 'api',
      totalCount: models.length,
      query
    };
  } catch (error: any) {
    logger.error('ModelSearch', 'External search failed', { query, error });
    return {
      models: [],
      source: 'api',
      totalCount: 0,
      query
    };
  }
}

/**
 * Parse external search result into ModelInfo
 */
function parseExternalResult(result: TavilySearchResult): ModelInfo | null {
  try {
    // Extract model name from title
    const title = result.title.toLowerCase();
    let provider: ApiProvider = 'custom';
    let modelId = '';
    let modelName = result.title;

    // Detect provider from URL or title
    if (result.url.includes('openai.com') || title.includes('gpt')) {
      provider = 'openai';
    } else if (result.url.includes('anthropic.com') || title.includes('claude')) {
      provider = 'anthropic';
    } else if (result.url.includes('google') || title.includes('gemini')) {
      provider = 'google';
    } else if (result.url.includes('deepseek') || title.includes('deepseek')) {
      provider = 'deepseek';
    } else if (result.url.includes('mistral') || title.includes('mistral')) {
      provider = 'mistral';
    } else if (result.url.includes('x.ai') || title.includes('grok')) {
      provider = 'xai';
    }

    // Generate model ID from title
    modelId = `external-${result.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 50)}`;

    return {
      id: modelId,
      name: modelName,
      provider,
      description: result.content.substring(0, 200) + '...',
      capabilities: ['chat']
    };
  } catch {
    return null;
  }
}

/**
 * Hybrid search: combine built-in and external results
 */
export async function searchHybrid(
  query: string,
  options?: {
    provider?: ApiProvider;
    category?: ModelCategory;
    limit?: number;
    externalConfig?: ExternalSearchConfig;
  }
): Promise<ModelSearchResult> {
  // Get built-in results
  const builtinResults = searchBuiltinModels(query, {
    provider: options?.provider,
    category: options?.category,
    limit: options?.limit ? Math.ceil(options.limit * 0.7) : undefined
  });

  // If no external config, return built-in only
  if (!options?.externalConfig?.apiKey) {
    return builtinResults;
  }

  // Get external results
  const externalResults = await searchExternalModels(query, options.externalConfig);

  // Merge results, prioritizing built-in
  const seenIds = new Set(builtinResults.models.map(m => m.id));
  const uniqueExternal = externalResults.models.filter(m => !seenIds.has(m.id));

  const mergedModels = [...builtinResults.models, ...uniqueExternal];

  // Apply limit
  const limitedModels = options?.limit
    ? mergedModels.slice(0, options.limit)
    : mergedModels;

  logger.debug('ModelSearch', 'Hybrid search completed', {
    query,
    builtinCount: builtinResults.models.length,
    externalCount: uniqueExternal.length,
    totalCount: limitedModels.length
  });

  return {
    models: limitedModels,
    source: 'mixed',
    totalCount: mergedModels.length,
    query
  };
}

// ============================================================================
// Model Search Service Class
// ============================================================================

class ModelSearchService {
  private cache: Map<string, { result: ModelSearchResult; timestamp: number }> = new Map();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  /**
   * Search models (built-in registry)
   */
  searchBuiltin = searchBuiltinModels;

  /**
   * Search models with caching
   */
  search(
    query?: string,
    options?: {
      provider?: ApiProvider;
      category?: ModelCategory;
      limit?: number;
      featuredOnly?: boolean;
      newOnly?: boolean;
      useCache?: boolean;
    }
  ): ModelSearchResult {
    const cacheKey = JSON.stringify({ query, options });

    // Check cache
    if (options?.useCache !== false) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.debug('ModelSearch', 'Returning cached result', { cacheKey });
        return cached.result;
      }
    }

    // Perform search
    const result = searchBuiltinModels(query, options);

    // Cache result
    this.cache.set(cacheKey, { result, timestamp: Date.now() });

    return result;
  }

  /**
   * Get model info by ID
   */
  getModel(modelId: string): ModelInfo | undefined {
    return getModelById(modelId);
  }

  /**
   * Get models by provider
   */
  getByProvider(provider: ApiProvider): ModelInfo[] {
    return getModelsByProvider(provider);
  }

  /**
   * Get featured models
   */
  getFeatured(): ModelInfo[] {
    return getFeaturedModels();
  }

  /**
   * Get new models
   */
  getNew(): ModelInfo[] {
    return getNewModels();
  }

  /**
   * Get available providers
   */
  getProviders(): ApiProvider[] {
    return getAvailableProviders();
  }

  /**
   * Get available capabilities
   */
  getCapabilities(): string[] {
    return getAvailableCapabilities();
  }

  /**
   * Search external API (Tavily)
   */
  async searchExternal(
    query: string,
    config: ExternalSearchConfig
  ): Promise<ModelSearchResult> {
    return searchExternalModels(query, config);
  }

  /**
   * Hybrid search (built-in + external)
   */
  async searchHybrid(
    query: string,
    options?: {
      provider?: ApiProvider;
      category?: ModelCategory;
      limit?: number;
      externalConfig?: ExternalSearchConfig;
    }
  ): Promise<ModelSearchResult> {
    const cacheKey = `hybrid-${JSON.stringify({ query, options: { ...options, externalConfig: undefined } })}`;

    // Check cache for hybrid results (only cache if external is not used)
    if (!options?.externalConfig?.apiKey) {
      const cached = this.cache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        return cached.result;
      }
    }

    const result = await searchHybrid(query, options);

    // Cache result if no external API used
    if (!options?.externalConfig?.apiKey) {
      this.cache.set(cacheKey, { result, timestamp: Date.now() });
    }

    return result;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
    logger.debug('ModelSearch', 'Cache cleared');
  }
}

export const modelSearchService = new ModelSearchService();
