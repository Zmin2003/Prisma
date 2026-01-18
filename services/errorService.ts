
export type ErrorCategory = 'API' | 'Network' | 'Config' | 'DeepThink' | 'User' | 'System';
export type ErrorSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ErrorContext {
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  code?: string;
  phase?: 'manager' | 'expert' | 'synthesis';
  timestamp: number;
  stack?: string;
  metadata?: Record<string, any>;
  userMessage?: string;
  actionable?: boolean;
  suggestedAction?: string;
}

export interface ErrorStats {
  total: number;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  recent: ErrorContext[];
  criticalCount: number;
}

export interface ErrorQueueItem {
  id: string;
  error: ErrorContext;
  count: number;
  firstOccurrence: number;
  lastOccurrence: number;
  hash: string;
}

export type ErrorListener = (error: ErrorContext, errorId: string) => void;

class ErrorService {
  private errorQueue: Map<string, ErrorQueueItem> = new Map();
  private errorHistory: ErrorContext[] = [];
  private maxHistorySize: number = 1000;
  private deduplicationWindow: number = 5000; // 5 seconds
  private listeners: Set<ErrorListener> = new Set();
  private stats: ErrorStats = {
    total: 0,
    byCategory: {
      API: 0,
      Network: 0,
      Config: 0,
      DeepThink: 0,
      User: 0,
      System: 0
    },
    bySeverity: {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    },
    recent: [],
    criticalCount: 0
  };

  constructor() {
    this.restoreFromStorage();
  }

  addListener(listener: ErrorListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  removeListener(listener: ErrorListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(error: ErrorContext, errorId: string): void {
    this.listeners.forEach(listener => {
      try {
        listener(error, errorId);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });
  }

  private restoreFromStorage() {
    try {
      const saved = sessionStorage.getItem('prisma_error_stats');
      if (saved) {
        const data = JSON.parse(saved);
        this.stats = data.stats || this.stats;
        this.errorHistory = data.history || [];
      }
    } catch (e) {
      console.warn('Failed to restore error stats');
    }
  }

  private persistToStorage() {
    try {
      const data = {
        stats: this.stats,
        history: this.errorHistory.slice(-100)
      };
      sessionStorage.setItem('prisma_error_stats', JSON.stringify(data));
    } catch (e) {
      // Ignore quota errors
    }
  }

  private generateErrorHash(error: ErrorContext): string {
    const key = `${error.category}:${error.code || error.message}:${error.phase || ''}`;
    return btoa(key).substring(0, 16);
  }

  private classifyError(error: Error | ErrorContext): ErrorContext {
    if ('category' in error && 'severity' in error) {
      return error as ErrorContext;
    }

    const err = error as Error;
    const message = err.message || 'Unknown error';
    const stack = err.stack;

    let category: ErrorCategory = 'System';
    let severity: ErrorSeverity = 'medium';
    let code: string | undefined;
    let userMessage: string | undefined;
    let actionable = false;
    let suggestedAction: string | undefined;

    // API errors
    if (message.includes('API') || message.includes('fetch') || message.includes('401') || message.includes('403')) {
      category = 'API';
      severity = 'high';
      code = 'API_ERROR';
      userMessage = 'API request failed. Please check your API key and configuration.';
      actionable = true;
      suggestedAction = 'Verify API key in Settings';
    }

    // Network errors
    if (message.includes('network') || message.includes('timeout') || message.includes('ECONNREFUSED')) {
      category = 'Network';
      severity = 'high';
      code = 'NETWORK_ERROR';
      userMessage = 'Network connection failed. Please check your internet connection.';
      actionable = true;
      suggestedAction = 'Check network connection';
    }

    // Configuration errors
    if (message.includes('config') || message.includes('key') || message.includes('invalid')) {
      category = 'Config';
      severity = 'critical';
      code = 'CONFIG_ERROR';
      userMessage = 'Configuration error detected. Please review your settings.';
      actionable = true;
      suggestedAction = 'Open Settings and verify configuration';
    }

    // DeepThink errors
    if (message.includes('manager') || message.includes('expert') || message.includes('synthesis')) {
      category = 'DeepThink';
      severity = 'high';
      code = 'DEEPTHINK_ERROR';
      userMessage = 'DeepThink reasoning process encountered an error.';
      actionable = true;
      suggestedAction = 'Try again or reduce thinking level';
    }

    // User errors
    if (message.includes('user') || message.includes('input') || message.includes('validation')) {
      category = 'User';
      severity = 'low';
      code = 'USER_ERROR';
      userMessage = 'Invalid input. Please check your request.';
      actionable = true;
      suggestedAction = 'Review your input and try again';
    }

    return {
      category,
      severity,
      message,
      code,
      timestamp: Date.now(),
      stack,
      userMessage,
      actionable,
      suggestedAction
    };
  }

  report(error: Error | ErrorContext, metadata?: Record<string, any>): string {
    const classified = this.classifyError(error);
    if (metadata) {
      classified.metadata = { ...classified.metadata, ...metadata };
    }

    const hash = this.generateErrorHash(classified);
    const now = Date.now();

    const existing = this.errorQueue.get(hash);
    if (existing && (now - existing.lastOccurrence) < this.deduplicationWindow) {
      existing.count++;
      existing.lastOccurrence = now;
      return existing.id;
    }

    const id = `ERR-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const queueItem: ErrorQueueItem = {
      id,
      error: classified,
      count: 1,
      firstOccurrence: now,
      lastOccurrence: now,
      hash
    };

    this.errorQueue.set(hash, queueItem);
    this.errorHistory.push(classified);

    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }

    this.updateStats(classified);
    this.persistToStorage();
    this.notifyListeners(classified, id);

    return id;
  }

  private updateStats(error: ErrorContext) {
    this.stats.total++;
    this.stats.byCategory[error.category]++;
    this.stats.bySeverity[error.severity]++;

    if (error.severity === 'critical') {
      this.stats.criticalCount++;
    }

    this.stats.recent.unshift(error);
    if (this.stats.recent.length > 10) {
      this.stats.recent = this.stats.recent.slice(0, 10);
    }
  }

  getStats(): ErrorStats {
    return { ...this.stats };
  }

  getRecentErrors(limit: number = 10): ErrorContext[] {
    return this.errorHistory.slice(-limit).reverse();
  }

  getErrorsByCategory(category: ErrorCategory): ErrorContext[] {
    return this.errorHistory.filter(e => e.category === category);
  }

  getErrorsBySeverity(severity: ErrorSeverity): ErrorContext[] {
    return this.errorHistory.filter(e => e.severity === severity);
  }

  getCriticalErrors(): ErrorContext[] {
    return this.errorHistory.filter(e => e.severity === 'critical');
  }

  clearQueue() {
    this.errorQueue.clear();
  }

  clearHistory() {
    this.errorHistory = [];
    this.stats = {
      total: 0,
      byCategory: {
        API: 0,
        Network: 0,
        Config: 0,
        DeepThink: 0,
        User: 0,
        System: 0
      },
      bySeverity: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      },
      recent: [],
      criticalCount: 0
    };
    this.persistToStorage();
  }

  getQueueSize(): number {
    return this.errorQueue.size;
  }

  getQueueItems(): ErrorQueueItem[] {
    return Array.from(this.errorQueue.values());
  }
}

export const errorService = new ErrorService();
