/**
 * Performance Panel Component
 * Displays real-time performance statistics and monitoring
 */

import { useState, useMemo, useEffect } from 'react';
import { Activity, TrendingUp, TrendingDown, Clock, Zap, AlertTriangle, XCircle } from 'lucide-react';
import { performanceMonitor, PerformanceStats } from '../services/performanceMonitor';

type PerformancePanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const PerformancePanel = ({ isOpen, onClose }: PerformancePanelProps) => {
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Load and refresh stats
  useEffect(() => {
    const loadStats = () => {
      const newStats = performanceMonitor.getStats();
      setStats(newStats);
    };

    loadStats();

    if (autoRefresh) {
      const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Performance Monitor
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="rounded"
              />
              Auto-refresh
            </label>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        {stats ? (
          <PerformanceContent stats={stats} />
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-gray-500 dark:text-gray-400">Loading statistics...</div>
          </div>
        )}
      </div>
    </div>
  );
};

// Performance Content Component
type PerformanceContentProps = {
  stats: PerformanceStats;
};

const PerformanceContent = ({ stats }: PerformanceContentProps) => {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6">
      {/* Overall Statistics */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Overall Statistics</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Total Executions"
            value={stats.totalExecutions.toString()}
            color="blue"
          />
          <StatCard
            icon={stats.successRate >= 90 ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
            label="Success Rate"
            value={formatPercentage(stats.successRate)}
            color={stats.successRate >= 90 ? 'green' : stats.successRate >= 70 ? 'yellow' : 'red'}
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Duration"
            value={formatDuration(stats.averageDuration)}
            color="purple"
          />
          <StatCard
            icon={<Zap className="w-5 h-5" />}
            label="Avg Experts"
            value={stats.averageExpertCount.toFixed(1)}
            color="indigo"
          />
        </div>
      </div>

      {/* Health Indicators */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Health Indicators</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <HealthIndicator
            label="Degradation Rate"
            value={stats.degradationRate}
            threshold={5}
            inverted={true}
          />
          <HealthIndicator
            label="Error Rate"
            value={stats.errorRate}
            threshold={10}
            inverted={true}
          />
        </div>
      </div>

      {/* Last 24 Hours */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last 24 Hours</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<Activity className="w-5 h-5" />}
            label="Executions"
            value={stats.last24h.executions.toString()}
            color="blue"
          />
          <StatCard
            icon={<TrendingUp className="w-5 h-5" />}
            label="Success Rate"
            value={formatPercentage(stats.last24h.successRate)}
            color={stats.last24h.successRate >= 90 ? 'green' : 'yellow'}
          />
          <StatCard
            icon={<Clock className="w-5 h-5" />}
            label="Avg Duration"
            value={formatDuration(stats.last24h.averageDuration)}
            color="purple"
          />
        </div>
      </div>

      {/* Model Performance */}
      <ModelPerformance byModel={stats.byModel} />
    </div>
  );
};

// Stat Card Component
type StatCardProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple' | 'indigo';
};

const StatCard = ({ icon, label, value, color }: StatCardProps) => {
  const colorClasses = {
    blue: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
    green: 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
    purple: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
    indigo: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-2">
        {icon}
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
};

// Health Indicator Component
type HealthIndicatorProps = {
  label: string;
  value: number;
  threshold: number;
  inverted?: boolean;
};

const HealthIndicator = ({ label, value, threshold, inverted = false }: HealthIndicatorProps) => {
  const isHealthy = inverted ? value < threshold : value >= threshold;
  const isWarning = inverted ? value >= threshold && value < threshold * 2 : value >= threshold * 0.7 && value < threshold;

  const getStatusColor = () => {
    if (isHealthy) return 'green';
    if (isWarning) return 'yellow';
    return 'red';
  };

  const statusColor = getStatusColor();
  const statusIcon = isHealthy ? (
    <TrendingUp className="w-5 h-5" />
  ) : (
    <AlertTriangle className="w-5 h-5" />
  );

  const colorClasses = {
    green: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    yellow: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    red: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
  };

  const textColorClasses = {
    green: 'text-green-600 dark:text-green-400',
    yellow: 'text-yellow-600 dark:text-yellow-400',
    red: 'text-red-600 dark:text-red-400'
  };

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[statusColor]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
        <span className={textColorClasses[statusColor]}>{statusIcon}</span>
      </div>
      <div className="flex items-baseline gap-2">
        <span className={`text-2xl font-bold ${textColorClasses[statusColor]}`}>
          {value.toFixed(1)}%
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          (threshold: {threshold}%)
        </span>
      </div>
      <div className="mt-2 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all ${
            statusColor === 'green' ? 'bg-green-500' :
            statusColor === 'yellow' ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
};

// Model Performance Component
type ModelPerformanceProps = {
  byModel: Record<string, {
    executions: number;
    successRate: number;
    averageDuration: number;
  }>;
};

const ModelPerformance = ({ byModel }: ModelPerformanceProps) => {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const models = Object.entries(byModel);

  if (models.length === 0) {
    return (
      <div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Model Performance</h3>
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          No model performance data available
        </div>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Model Performance</h3>
      <div className="space-y-3">
        {models.map(([model, stats]) => (
          <div
            key={model}
            className="p-4 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="font-medium text-gray-900 dark:text-white">{model}</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {stats.executions} executions
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Success Rate</div>
                <div className={`text-lg font-semibold ${
                  stats.successRate >= 90 ? 'text-green-600 dark:text-green-400' :
                  stats.successRate >= 70 ? 'text-yellow-600 dark:text-yellow-400' :
                  'text-red-600 dark:text-red-400'
                }`}>
                  {formatPercentage(stats.successRate)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Avg Duration</div>
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {formatDuration(stats.averageDuration)}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
