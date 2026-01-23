
export type ModelOption = 'deepthink' | string;
export type ThinkingLevel = 'minimal' | 'low' | 'medium' | 'high';

export type ToolConfig = {
  enableWebSearch: boolean;
  webSearchProvider: 'tavily' | 'duckduckgo' | 'auto';
  maxSearchResults: number;
};

export type ExpertConfig = {
  id: string;
  role: string;
  description: string;
  temperature: number;
  prompt: string;
};

export type ExpertResult = ExpertConfig & {
  status: 'pending' | 'thinking' | 'completed' | 'error';
  content?: string;
  thoughts?: string; 
  thoughtProcess?: string; 
  startTime?: number;
  endTime?: number;
  round?: number;
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

export type AppState = 'idle' | 'analyzing' | 'experts_working' | 'reviewing' | 'synthesizing' | 'completed';

export type AppConfig = {
  planningLevel: ThinkingLevel;
  expertLevel: ThinkingLevel;
  synthesisLevel: ThinkingLevel;
  enableProcessStream?: boolean;
  toolConfig?: ToolConfig;

  backendUrl?: string;

  appApiKey?: string;
  rememberAppApiKey?: boolean;

  enableCustomApi?: boolean;
  customApiKey?: string;
  rememberCustomApiKey?: boolean;
  customBaseUrl?: string;
};

export type MessageAttachment = {
  id: string;
  type: 'image';
  mimeType: string;
  data: string;
  url?: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'model';
  content: string;
  attachments?: MessageAttachment[];
  analysis?: AnalysisResult | null;
  experts?: ExpertResult[];
  synthesisThoughts?: string;
  isThinking?: boolean;
  totalDuration?: number;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  model: ModelOption;
};
