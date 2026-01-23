/**
 * DeepThink Frontend API - 连接 Python 后端
 */

import { ApiProvider, CustomModel } from './types';
import { logger } from './services/logger';

const DEFAULT_BACKEND_URL = import.meta.env?.VITE_BACKEND_URL || '';

const normalizeBackendUrl = (url?: string): string => {
  const trimmed = (url || '').trim();
  if (!trimmed) return '';
  return trimmed.replace(/\/+$/, '');
};

const getBackendUrl = (backendUrl?: string): string => {
  const normalized = normalizeBackendUrl(backendUrl);
  return normalized || normalizeBackendUrl(DEFAULT_BACKEND_URL);
};

const buildUrl = (path: string, backendUrl?: string): string => {
  const base = getBackendUrl(backendUrl);
  const p = path.startsWith('/') ? path : `/${path}`;
  return base ? `${base}${p}` : p;
};

const buildAuthHeaders = (appApiKey?: string): Record<string, string> => {
  const key = (appApiKey || '').trim();
  if (!key) return {};
  return { Authorization: `Bearer ${key}` };
};

export const findCustomModel = (modelName: string, customModels?: CustomModel[]): CustomModel | undefined => {
  return customModels?.find(m => m.name === modelName);
};

export const getAIProvider = (model: string): ApiProvider => {
  return 'custom';
};

export const getAI = (backendUrl?: string) => {
  return {
    baseUrl: getBackendUrl(backendUrl),
  };
};

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface StreamCallbacks {
  onChunk?: (content: string) => void;
  onStateUpdate?: (state: ProcessState) => void;
  onExpertUpdate?: (experts: any[]) => void;
  onComplete?: (result: DeepThinkResult) => void;
  onError?: (error: Error) => void;
}

export interface ProcessState {
  node: string;
  status: 'started' | 'completed' | 'error';
  round?: number;
  data?: any;
}

export interface ManagerAnalysis {
  thought_process: string;
  experts: Array<{
    role: string;
    description: string;
    temperature: number;
    prompt: string;
  }>;
}

export interface DeepThinkResult {
  final_output: string;
  structured_output?: any;
  experts: any[];
  review_score?: any;
  rounds: number;
  manager_analysis?: ManagerAnalysis;
  synthesis_thoughts?: string;
}

export async function healthCheck(options?: { backendUrl?: string; appApiKey?: string }): Promise<boolean> {
  try {
    const resp = await fetch(buildUrl('/health', options?.backendUrl), {
      headers: buildAuthHeaders(options?.appApiKey),
    });
    return resp.ok;
  } catch {
    return false;
  }
}

export interface BackendModel {
  id: string;
  object: string;
  created: number;
  owned_by: string;
}

export interface RegistryModel {
  id: string;
  display_name: string;
  provider: string;
  upstream_model: string;
  base_url?: string;
  credential_ref?: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function listModels(options?: { backendUrl?: string; appApiKey?: string }): Promise<BackendModel[]> {
  try {
    const resp = await fetch(buildUrl('/v1/models', options?.backendUrl), {
      headers: buildAuthHeaders(options?.appApiKey),
    });
    if (!resp.ok) return [];
    const data = await resp.json();
    return data.data || [];
  } catch {
    return [];
  }
}

export async function adminListModels(
  adminKey: string,
  options?: { backendUrl?: string }
): Promise<RegistryModel[]> {
  try {
    const resp = await fetch(buildUrl('/admin/models', options?.backendUrl), {
      headers: { 'X-Admin-Key': adminKey },
    });
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return data.models || [];
  } catch (e) {
    logger.error('API', 'Failed to list admin models', e);
    throw e;
  }
}

export interface CreateModelPayload {
  id: string;
  display_name: string;
  provider: string;
  upstream_model: string;
  base_url?: string;
  credential_ref?: string;
  enabled?: boolean;
}

export async function adminCreateModel(
  adminKey: string,
  model: CreateModelPayload,
  options?: { backendUrl?: string }
): Promise<RegistryModel> {
  const resp = await fetch(buildUrl('/admin/models', options?.backendUrl), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify(model),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export interface UpdateModelPayload {
  display_name?: string;
  provider?: string;
  upstream_model?: string;
  base_url?: string;
  credential_ref?: string;
  enabled?: boolean;
}

export async function adminUpdateModel(
  adminKey: string,
  modelId: string,
  updates: UpdateModelPayload,
  options?: { backendUrl?: string }
): Promise<RegistryModel> {
  const resp = await fetch(buildUrl(`/admin/models/${encodeURIComponent(modelId)}`, options?.backendUrl), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Key': adminKey,
    },
    body: JSON.stringify(updates),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
  return resp.json();
}

export async function adminDeleteModel(
  adminKey: string,
  modelId: string,
  options?: { backendUrl?: string }
): Promise<void> {
  const resp = await fetch(buildUrl(`/admin/models/${encodeURIComponent(modelId)}`, options?.backendUrl), {
    method: 'DELETE',
    headers: { 'X-Admin-Key': adminKey },
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({ detail: `HTTP ${resp.status}` }));
    throw new Error(err.detail || `HTTP ${resp.status}`);
  }
}

export interface ToolConfigPayload {
  enable_web_search?: boolean;
  web_search_provider?: string;
  native_web?: boolean;
  max_search_results?: number;
}

export interface InvokeOptions {
  backendUrl?: string;
  appApiKey?: string;

  context?: string;
  maxRounds?: number;
  model?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  planningLevel?: string;
  expertLevel?: string;
  synthesisLevel?: string;
  toolConfig?: ToolConfigPayload;
}

export async function invokeDeepThink(
  query: string,
  options?: InvokeOptions
): Promise<DeepThinkResult> {
  logger.info('API', 'Invoking DeepThink', { query: query.slice(0, 50) });
  
  const resp = await fetch(buildUrl('/deepthink/invoke', options?.backendUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...buildAuthHeaders(options?.appApiKey) },
    body: JSON.stringify({
      query,
      context: options?.context || '',
      max_rounds: options?.maxRounds || 5,
      model: options?.model,
      provider: options?.provider,
      api_key: options?.apiKey,
      base_url: options?.baseUrl,
      planning_level: options?.planningLevel,
      expert_level: options?.expertLevel,
      synthesis_level: options?.synthesisLevel,
      tool_config: options?.toolConfig,
    }),
  });

  if (!resp.ok) {
    throw new Error(`API error: ${resp.status}`);
  }

  return resp.json();
}

export interface StreamChatOptions {
  backendUrl?: string;
  appApiKey?: string;

  model?: string;
  maxRounds?: number;
  signal?: AbortSignal;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  planningLevel?: string;
  expertLevel?: string;
  synthesisLevel?: string;
  toolConfig?: ToolConfigPayload;
}

export async function streamChat(
  messages: ChatMessage[],
  callbacks: StreamCallbacks,
  options?: StreamChatOptions
): Promise<void> {
  const { onChunk, onComplete, onError } = callbacks;
  const { backendUrl, appApiKey, signal, model, maxRounds, provider, apiKey, baseUrl, planningLevel, expertLevel, synthesisLevel, toolConfig } = options ?? {};

  try {
    const resp = await fetch(buildUrl('/v1/chat/completions', backendUrl), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...buildAuthHeaders(appApiKey) },
      body: JSON.stringify({
        model: model || 'deepthink',
        messages,
        stream: true,
        max_rounds: maxRounds || 5,
        provider,
        api_key: apiKey,
        base_url: baseUrl,
        planning_level: planningLevel,
        expert_level: expertLevel,
        synthesis_level: synthesisLevel,
        tool_config: toolConfig,
      }),
      signal,
    });

    if (!resp.ok) {
      throw new Error(`API error: ${resp.status}`);
    }

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.replace(/^data:\s?/, '');
        
        if (data === '[DONE]') {
          onComplete?.({
            final_output: fullContent,
            experts: [],
            rounds: 1,
          });
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          
          if (content) {
            fullContent += content;
            onChunk?.(content);
          }
        } catch {
        }
      }
    }

    const remaining = buffer.trim();
    if (remaining.startsWith('data:')) {
      const data = remaining.replace(/^data:\s?/, '');
      if (data === '[DONE]') {
        onComplete?.({
          final_output: fullContent,
          experts: [],
          rounds: 1,
        });
        return;
      }
      try {
        const parsed = JSON.parse(data);
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) {
          fullContent += content;
          onChunk?.(content);
        }
      } catch {
      }
    }

    onComplete?.({
      final_output: fullContent,
      experts: [],
      rounds: 1,
    });
  } catch (error) {
    if ((error as Error).name === 'AbortError') return;
    onError?.(error as Error);
  }
}

export interface WebSocketOptions {
  backendUrl?: string;
  appApiKey?: string;

  context?: string;
  maxRounds?: number;
  model?: string;
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  planningLevel?: string;
  expertLevel?: string;
  synthesisLevel?: string;
  toolConfig?: ToolConfigPayload;
}

export function connectWebSocket(
  query: string,
  callbacks: StreamCallbacks,
  options?: WebSocketOptions
): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const backendUrl = getBackendUrl(options?.backendUrl);
  const wsUrl = backendUrl ? backendUrl.replace(/^http/, 'ws') : `${protocol}//${window.location.host}`;
  const ws = new WebSocket(`${wsUrl}/ws/chat`);

  ws.onopen = () => {
    logger.info('WebSocket', 'Connected');
    ws.send(JSON.stringify({
      query,
      context: options?.context || '',
      app_api_key: options?.appApiKey,
      max_rounds: options?.maxRounds || 5,
      model: options?.model,
      provider: options?.provider,
      api_key: options?.apiKey,
      base_url: options?.baseUrl,
      planning_level: options?.planningLevel,
      expert_level: options?.expertLevel,
      synthesis_level: options?.synthesisLevel,
      tool_config: options?.toolConfig,
    }));
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      if (data.type === 'state_update') {
        callbacks.onStateUpdate?.({
          node: data.node,
          status: data.status,
          round: data.round,
          data: data.data,
        });

        if (data.data?.experts) {
          callbacks.onExpertUpdate?.(data.data.experts);
        }

        if (data.data?.final_output) {
          callbacks.onChunk?.(data.data.final_output);
        }
      } else if (data.type === 'complete') {
        callbacks.onComplete?.({
          final_output: data.data?.final_output || '',
          experts: data.data?.experts || [],
          rounds: data.round || 1,
        });
      } else if (data.type === 'error') {
        callbacks.onError?.(new Error(data.message));
      }
    } catch {
      // ignore parse errors
    }
  };

  ws.onerror = () => {
    callbacks.onError?.(new Error('WebSocket error'));
  };

  ws.onclose = () => {
    logger.info('WebSocket', 'Disconnected');
  };

  return () => ws.close();
}
