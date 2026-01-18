
export type ModelOption = 'gemini-3-flash-preview' | 'gemini-3-pro-preview' | 'custom' | string;
export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';
export type ApiProvider = 'google' | 'openai' | 'deepseek' | 'anthropic' | 'xai' | 'mistral' | 'custom';

export type CustomModel = {
  id: string;
  name: string;
  provider: ApiProvider;
  apiKey?: string;
  baseUrl?: string;
};

export type ExpertConfig = {
  id: string;
  role: string;
  description: string;
  temperature: number;
  prompt: string;
};

export type RetryStatus = {
  isRetrying: boolean;
  attempt: number;
  maxRetries: number;
  errorType?: 'network' | 'api' | 'client' | 'unknown';
  nextRetryDelay?: number;
};

export type ExpertResult = ExpertConfig & {
  status: 'pending' | 'thinking' | 'completed' | 'error' | 'timeout' | 'retrying';
  content?: string;
  thoughts?: string;
  thoughtProcess?: string;
  startTime?: number;
  endTime?: number;
  round?: number;
  errorMessage?: string;
  retryStatus?: RetryStatus;
};

export type AnalysisResult = {
  thought_process: string;
  experts: Omit<ExpertConfig, 'id'>[];
};

export type ReviewResult = {
  satisfied: boolean;
  critique: string;
  next_round_strategy?: string;
  refined_experts?: Omit<ExpertConfig, 'id'>[];
};

export type DegradationLevel = 'full' | 'simplified' | 'single' | 'direct';

export type DegradationReason =
  | 'timeout'
  | 'retry_exhausted'
  | 'api_error'
  | 'network_error'
  | 'manual';

export type DegradationStatus = {
  level: DegradationLevel;
  reason?: DegradationReason;
  triggeredAt?: number;
  originalLevel?: DegradationLevel;
};

export type AppState = 'idle' | 'analyzing' | 'experts_working' | 'reviewing' | 'synthesizing' | 'completed';

export type AppConfig = {
  planningLevel: ThinkingLevel;
  expertLevel: ThinkingLevel;
  synthesisLevel: ThinkingLevel;
  customApiKey?: string;
  customBaseUrl?: string;
  enableCustomApi?: boolean;
  enableRecursiveLoop?: boolean;
  apiProvider?: ApiProvider;
  customModels?: CustomModel[];
};

export type MessageAttachment = {
  id: string;
  type: 'image';
  mimeType: string;
  data: string; // Base64 string
  url?: string; // For display
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: MessageAttachment[];
  // DeepThink Artifacts (only for model messages)
  analysis?: AnalysisResult | null;
  experts?: ExpertResult[];
  synthesisThoughts?: string;
  isThinking?: boolean;
  totalDuration?: number; // Total time in ms
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  model: ModelOption;
};

export class TimeoutError extends Error {
  constructor(
    public readonly phase: 'manager' | 'expert' | 'synthesis',
    public readonly timeoutMs: number
  ) {
    super(`${phase} operation timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

export type DeepThinkSnapshot = {
  id: string;
  timestamp: number;
  sessionId: string;
  query: string;
  model: ModelOption;
  appState: AppState;
  managerAnalysis: AnalysisResult | null;
  experts: ExpertResult[];
  finalOutput: string;
  synthesisThoughts: string;
  processStartTime: number | null;
  processEndTime: number | null;
  degradationStatus: DegradationStatus | null;
  currentRound: number;
  recentHistory: string;
  attachments: MessageAttachment[];
  config: AppConfig;
};

export type SnapshotMetadata = {
  id: string;
  timestamp: number;
  sessionId: string;
  query: string;
  model: ModelOption;
  appState: AppState;
  canResume: boolean;
};
