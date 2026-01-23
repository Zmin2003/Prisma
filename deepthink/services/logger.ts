
export type LogLevel = 'info' | 'warn' | 'error' | 'debug';
export type LogCategory = 'System' | 'User' | 'API' | 'Manager' | 'Expert' | 'Synthesis' | 'WebSocket' | 'State';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
}

const isProd = import.meta.env.PROD;

class LoggerService {
  private logs: LogEntry[] = [];
  private maxLogs: number = 5000;
  private persistTimeout: ReturnType<typeof setTimeout> | null = null;
  private pendingPersist = false;

  constructor() {
    if (!isProd) {
      try {
        const saved = sessionStorage.getItem('deepthink_logs');
        if (saved) {
          this.logs = JSON.parse(saved);
        }
      } catch (e) {
        console.warn('Failed to restore logs');
      }
    }
    
    if (!isProd) {
      this.info('System', 'Logger service initialized');
    }
  }

  private persist() {
    if (isProd) return;
    
    if (this.pendingPersist) return;
    this.pendingPersist = true;
    
    if (this.persistTimeout) clearTimeout(this.persistTimeout);
    this.persistTimeout = setTimeout(() => {
      try {
        sessionStorage.setItem('deepthink_logs', JSON.stringify(this.logs.slice(-500)));
      } catch (e) {
      }
      this.pendingPersist = false;
    }, 2000);
  }

  add(level: LogLevel, category: LogCategory, message: string, data?: any) {
    if (isProd && (level === 'info' || level === 'debug')) {
      return;
    }

    const redactedData = data ? JSON.parse(JSON.stringify(data, this.replacer)) : undefined;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: redactedData
    };

    this.logs.push(entry);
    
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(this.logs.length - this.maxLogs);
    }

    if (!isProd) {
      const style = level === 'error' ? 'color: red' : level === 'warn' ? 'color: orange' : 'color: cyan';
      console.log(`%c[${category}] ${message}`, style, redactedData || '');
    } else if (level === 'error') {
      console.error(`[${category}] ${message}`, redactedData || '');
    }

    this.persist();
  }

  private replacer(key: string, value: any) {
    const normalizedKey = key.toLowerCase();
    if (normalizedKey.includes('apikey') || normalizedKey.includes('api_key') || normalizedKey.includes('token') || normalizedKey.includes('secret') || normalizedKey === 'auth') return '***REDACTED***';
    return value;
  }

  info(category: LogCategory, message: string, data?: any) {
    this.add('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any) {
    this.add('warn', category, message, data);
  }

  error(category: LogCategory, message: string, data?: any) {
    this.add('error', category, message, data);
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
      if (entry.data) {
        line += `\n   Data: ${JSON.stringify(entry.data, null, 2)}`;
      }
      return line;
    }).join('\n----------------------------------------\n');

    const blob = new Blob([textContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deepthink-debug-log-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const logger = new LoggerService();
