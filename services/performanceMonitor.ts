/**
 * Performance Monitoring Service
 * Tracks DeepThink execution metrics and system performance
 */

export type PerformanceMetric = {
  id: string;
  timestamp: number;
  sessionId: string;
  query: string;
  model: string;

  // Timing metrics
  totalDuration: number;
  managerDuration?: number;
  expertsDuration?: number;
  synthesisDuration?: number;

  // Expert metrics
  expertCount: number;
  expertSuccessCount: number;
  expertFailureCount: number;
  expertTimeoutCount: number;

  // Degradation metrics
  degradationLevel: string;
  degradationTriggered: boolean;

  // Error metrics
  errorCount: number;
  retryCount: number;

  // Resource metrics
  memoryUsage?: number;

  // Status
  status: 'success' | 'partial' | 'failed';
};

export type PerformanceStats = {
  totalExecutions: number;
  successRate: number;
  averageDuration: number;
  averageExpertCount: number;
  degradationRate: number;
  errorRate: number;

  // Time-based stats
  last24h: {
    executions: number;
    successRate: number;
    averageDuration: number;
  };

  // Model-based stats
  byModel: Record<string, {
    executions: number;
    successRate: number;
    averageDuration: number;
  }>;
};

class PerformanceMonitorService {
  private metrics: PerformanceMetric[] = [];
  private readonly STORAGE_KEY = 'prisma-performance-metrics';
  private readonly MAX_METRICS = 1000; // Keep last 1000 metrics

  constructor() {
    this.loadMetrics();
  }

  /**
   * Load metrics from localStorage
   */
  private loadMetrics(): void {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        this.metrics = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load performance metrics:', e);
      this.metrics = [];
    }
  }

  /**
   * Save metrics to localStorage
   */
  private saveMetrics(): void {
    try {
      // Keep only the most recent metrics
      if (this.metrics.length > this.MAX_METRICS) {
        this.metrics = this.metrics.slice(-this.MAX_METRICS);
      }
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (e) {
      console.error('Failed to save performance metrics:', e);
    }
  }

  /**
   * Record a new performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);
    this.saveMetrics();
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * Get metrics for a specific session
   */
  getSessionMetrics(sessionId: string): PerformanceMetric[] {
    return this.metrics.filter(m => m.sessionId === sessionId);
  }

  /**
   * Get metrics within a time range
   */
  getMetricsInRange(startTime: number, endTime: number): PerformanceMetric[] {
    return this.metrics.filter(m => m.timestamp >= startTime && m.timestamp <= endTime);
  }

  /**
   * Calculate performance statistics
   */
  getStats(): PerformanceStats {
    if (this.metrics.length === 0) {
      return this.getEmptyStats();
    }

    const now = Date.now();
    const last24h = now - 24 * 60 * 60 * 1000;
    const recentMetrics = this.metrics.filter(m => m.timestamp >= last24h);

    // Overall stats
    const totalExecutions = this.metrics.length;
    const successCount = this.metrics.filter(m => m.status === 'success').length;
    const successRate = (successCount / totalExecutions) * 100;

    const totalDuration = this.metrics.reduce((sum, m) => sum + m.totalDuration, 0);
    const averageDuration = totalDuration / totalExecutions;

    const totalExperts = this.metrics.reduce((sum, m) => sum + m.expertCount, 0);
    const averageExpertCount = totalExperts / totalExecutions;

    const degradationCount = this.metrics.filter(m => m.degradationTriggered).length;
    const degradationRate = (degradationCount / totalExecutions) * 100;

    const errorCount = this.metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const errorRate = (errorCount / totalExecutions) * 100;

    // Last 24h stats
    const last24hStats = this.calculateTimeRangeStats(recentMetrics);

    // Model-based stats
    const byModel = this.calculateModelStats();

    return {
      totalExecutions,
      successRate,
      averageDuration,
      averageExpertCount,
      degradationRate,
      errorRate,
      last24h: last24hStats,
      byModel
    };
  }

  /**
   * Calculate stats for a time range
   */
  private calculateTimeRangeStats(metrics: PerformanceMetric[]) {
    if (metrics.length === 0) {
      return {
        executions: 0,
        successRate: 0,
        averageDuration: 0
      };
    }

    const executions = metrics.length;
    const successCount = metrics.filter(m => m.status === 'success').length;
    const successRate = (successCount / executions) * 100;

    const totalDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0);
    const averageDuration = totalDuration / executions;

    return {
      executions,
      successRate,
      averageDuration
    };
  }

  /**
   * Calculate stats by model
   */
  private calculateModelStats(): Record<string, { executions: number; successRate: number; averageDuration: number }> {
    const modelGroups: Record<string, PerformanceMetric[]> = {};

    this.metrics.forEach(metric => {
      if (!modelGroups[metric.model]) {
        modelGroups[metric.model] = [];
      }
      modelGroups[metric.model].push(metric);
    });

    const result: Record<string, { executions: number; successRate: number; averageDuration: number }> = {};

    Object.entries(modelGroups).forEach(([model, metrics]) => {
      const executions = metrics.length;
      const successCount = metrics.filter(m => m.status === 'success').length;
      const successRate = (successCount / executions) * 100;

      const totalDuration = metrics.reduce((sum, m) => sum + m.totalDuration, 0);
      const averageDuration = totalDuration / executions;

      result[model] = {
        executions,
        successRate,
        averageDuration
      };
    });

    return result;
  }

  /**
   * Get empty stats structure
   */
  private getEmptyStats(): PerformanceStats {
    return {
      totalExecutions: 0,
      successRate: 0,
      averageDuration: 0,
      averageExpertCount: 0,
      degradationRate: 0,
      errorRate: 0,
      last24h: {
        executions: 0,
        successRate: 0,
        averageDuration: 0
      },
      byModel: {}
    };
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics = [];
    this.saveMetrics();
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify(this.metrics, null, 2);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitorService();
