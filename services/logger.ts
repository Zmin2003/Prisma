import { errorService, ErrorContext, ErrorCategory } from './errorService';

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogCategory = 'System' | 'User' | 'API' | 'Manager' | 'Expert' | 'Synthesis' | 'Degradation' | 'Snapshot';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  errorId?: string;
}

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 5000;

  constructor() {
    // Attempt to restore logs from sessionStorage on load (optional persistence)
    try {
      const saved = sessionStorage.getItem('prisma_logs');
      if (saved) {
        this.logs = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to restore logs');
    }
    
    this.info('System', 'Logger service initialized');
  }

  private persist() {
    try {
      sessionStorage.setItem('prisma_logs', JSON.stringify(this.logs.slice(-500))); // Persist last 500 only
    } catch (e) {
      // Ignore quota errors
    }
  }

  add(level: LogLevel, category: LogCategory, message: string, data?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data, this.replacer)) : undefined
    };

    this.logs.push(entry);
    
    // Trim if too large
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }

    // Mirror to console for dev
    if (import.meta.env.DEV) {
      const style = level === 'error' ? 'color: red' : level === 'warn' ? 'color: orange' : 'color: cyan';
      console.log(`%c[${category}] ${message}`, style, data || '');
    }

    this.persist();
  }

  // Circular reference replacer for JSON
  private replacer(key: string, value: any) {
    if (key === 'apiKey') return '***REDACTED***';
    if (key === 'auth') return '***REDACTED***';
    return value;
  }

  info(category: LogCategory, message: string, data?: any) {
    this.add('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any) {
    this.add('warn', category, message, data);
  }

  error(category: LogCategory, message: string, data?: any) {
    // Map LogCategory to ErrorCategory
    const errorCategoryMap: Record<LogCategory, ErrorCategory> = {
      'System': 'System',
      'User': 'User',
      'API': 'API',
      'Manager': 'DeepThink',
      'Expert': 'DeepThink',
      'Synthesis': 'DeepThink',
      'Degradation': 'DeepThink',
      'Snapshot': 'System'
    };

    // Report to error service
    const errorContext: ErrorContext = {
      category: errorCategoryMap[category],
      severity: 'high',
      message,
      timestamp: Date.now(),
      metadata: data,
      phase: category === 'Manager' ? 'manager' :
             category === 'Expert' ? 'expert' :
             category === 'Synthesis' ? 'synthesis' : undefined
    };

    const errorId = errorService.report(errorContext);

    // Add to logs with error ID
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: 'error',
      category,
      message,
      data: data ? JSON.parse(JSON.stringify(data, this.replacer)) : undefined,
      errorId
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }

    if (import.meta.env.DEV) {
      console.log(`%c[${category}] ${message} [Error ID: ${errorId}]`, 'color: red', data || '');
    }

    this.persist();
  }

  debug(category: LogCategory, message: string, data?: any) {
    this.add('debug', category, message, data);
  }

  getLogs() {
    return this.logs;
  }

  clear() {
    this.logs = [];
    this.persist();
    this.info('System', 'Logs cleared by user');
  }

  download() {
    const textContent = this.logs.map(entry => {
      const date = new Date(entry.timestamp).toLocaleTimeString();
      let line = `[${date}] [${entry.level.toUpperCase()}] [${entry.category}]: ${entry.message}`;
      if (entry.errorId) {
        line += ` [Error ID: ${entry.errorId}]`;
      }
      if (entry.data) {
        line += `\n   Data: ${JSON.stringify(entry.data, null, 2)}`;
      }
      return line;
    }).join('\n----------------------------------------\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prisma-debug-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Error service integration methods
  getErrorStats() {
    return errorService.getStats();
  }

  getRecentErrors(limit?: number) {
    return errorService.getRecentErrors(limit);
  }

  getCriticalErrors() {
    return errorService.getCriticalErrors();
  }

  getErrorsByCategory(category: ErrorCategory) {
    return errorService.getErrorsByCategory(category);
  }

  clearErrors() {
    errorService.clearHistory();
    errorService.clearQueue();
  }
}

export const logger = new LoggerService();
