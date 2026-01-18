/**
 * History Panel Component
 * Displays reasoning history with search and filtering capabilities
 */

import { useState, useMemo } from 'react';
import { Search, Clock, CheckCircle, XCircle, AlertCircle, Download, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { performanceMonitor, PerformanceMetric } from '../services/performanceMonitor';

type HistoryFilter = 'all' | 'success' | 'failed' | 'partial';
type SortBy = 'time' | 'duration' | 'model';

type HistoryPanelProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const HistoryPanel = ({ isOpen, onClose }: HistoryPanelProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<HistoryFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('time');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Load metrics
  const allMetrics = useMemo(() => {
    return performanceMonitor.getAllMetrics();
  }, []);

  // Filter and sort metrics
  const filteredMetrics = useMemo(() => {
    let filtered = allMetrics;

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(m => m.status === filter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.query.toLowerCase().includes(query) ||
        m.model.toLowerCase().includes(query) ||
        m.sessionId.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'time':
          return b.timestamp - a.timestamp;
        case 'duration':
          return b.totalDuration - a.totalDuration;
        case 'model':
          return a.model.localeCompare(b.model);
        default:
          return 0;
      }
    });

    return filtered;
  }, [allMetrics, filter, searchQuery, sortBy]);

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleExport = () => {
    const data = performanceMonitor.exportMetrics();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prisma-history-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all history? This cannot be undone.')) {
      performanceMonitor.clearMetrics();
      window.location.reload();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Reasoning History
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by query, model, or session ID..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filters and Actions */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              {/* Status Filter */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as HistoryFilter)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="partial">Partial</option>
                <option value="failed">Failed</option>
              </select>

              {/* Sort By */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="time">Sort by Time</option>
                <option value="duration">Sort by Duration</option>
                <option value="model">Sort by Model</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExport}
                className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Export
              </button>
              <button
                onClick={handleClear}
                className="px-3 py-1.5 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                Clear
              </button>
            </div>
          </div>

          {/* Results Count */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {filteredMetrics.length} of {allMetrics.length} records
          </div>
        </div>

        {/* Content */}
        <HistoryContent
          metrics={filteredMetrics}
          expandedItems={expandedItems}
          onToggleExpand={toggleExpand}
        />
      </div>
    </div>
  );
};

// History Content Component
type HistoryContentProps = {
  metrics: PerformanceMetric[];
  expandedItems: Set<string>;
  onToggleExpand: (id: string) => void;
};

const HistoryContent = ({ metrics, expandedItems, onToggleExpand }: HistoryContentProps) => {
  if (metrics.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-gray-500 dark:text-gray-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-lg font-medium">No history found</p>
          <p className="text-sm mt-1">Your reasoning history will appear here</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-2">
      {metrics.map((metric) => (
        <HistoryItem
          key={metric.id}
          metric={metric}
          isExpanded={expandedItems.has(metric.id)}
          onToggleExpand={() => onToggleExpand(metric.id)}
        />
      ))}
    </div>
  );
};

// History Item Component
type HistoryItemProps = {
  metric: PerformanceMetric;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const HistoryItem = ({ metric, isExpanded, onToggleExpand }: HistoryItemProps) => {
  const statusIcon = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    partial: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    failed: <XCircle className="w-5 h-5 text-red-500" />
  }[metric.status];

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 overflow-hidden">
      {/* Header */}
      <button
        onClick={onToggleExpand}
        className="w-full p-3 flex items-start gap-3 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
      >
        <div className="flex-shrink-0 mt-0.5">
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>

        <div className="flex-shrink-0 mt-0.5">{statusIcon}</div>

        <div className="flex-1 min-w-0 text-left">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
              {metric.query}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
              {formatTimestamp(metric.timestamp)}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(metric.totalDuration)}
            </span>
            <span>{metric.model}</span>
            <span>{metric.expertCount} experts</span>
            {metric.degradationTriggered && (
              <span className="text-yellow-600 dark:text-yellow-400">Degraded</span>
            )}
          </div>
        </div>
      </button>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-750 space-y-3">
          <HistoryItemDetails metric={metric} />
        </div>
      )}
    </div>
  );
};

// History Item Details Component
type HistoryItemDetailsProps = {
  metric: PerformanceMetric;
};

const HistoryItemDetails = ({ metric }: HistoryItemDetailsProps) => {
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <div className="space-y-3 text-sm">
      {/* Session Info */}
      <div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Session ID</div>
        <div className="text-gray-900 dark:text-white font-mono text-xs">{metric.sessionId}</div>
      </div>

      {/* Timing Breakdown */}
      <div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Timing Breakdown</div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total Duration:</span>
            <span className="font-medium text-gray-900 dark:text-white">{formatDuration(metric.totalDuration)}</span>
          </div>
          {metric.managerDuration !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Manager:</span>
              <span className="text-gray-900 dark:text-white">{formatDuration(metric.managerDuration)}</span>
            </div>
          )}
          {metric.expertsDuration !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Experts:</span>
              <span className="text-gray-900 dark:text-white">{formatDuration(metric.expertsDuration)}</span>
            </div>
          )}
          {metric.synthesisDuration !== undefined && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Synthesis:</span>
              <span className="text-gray-900 dark:text-white">{formatDuration(metric.synthesisDuration)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Expert Statistics */}
      <div>
        <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Expert Statistics</div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white dark:bg-gray-800 p-2 rounded border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400">Total</div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">{metric.expertCount}</div>
          </div>
          <div className="bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800">
            <div className="text-xs text-green-600 dark:text-green-400">Success</div>
            <div className="text-lg font-semibold text-green-700 dark:text-green-300">{metric.expertSuccessCount}</div>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded border border-red-200 dark:border-red-800">
            <div className="text-xs text-red-600 dark:text-red-400">Failed</div>
            <div className="text-lg font-semibold text-red-700 dark:text-red-300">{metric.expertFailureCount}</div>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded border border-yellow-200 dark:border-yellow-800">
            <div className="text-xs text-yellow-600 dark:text-yellow-400">Timeout</div>
            <div className="text-lg font-semibold text-yellow-700 dark:text-yellow-300">{metric.expertTimeoutCount}</div>
          </div>
        </div>
      </div>

      {/* Error and Retry Info */}
      {(metric.errorCount > 0 || metric.retryCount > 0) && (
        <div>
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Error & Retry Info</div>
          <div className="space-y-1">
            {metric.errorCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Errors:</span>
                <span className="text-red-600 dark:text-red-400 font-medium">{metric.errorCount}</span>
              </div>
            )}
            {metric.retryCount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Retries:</span>
                <span className="text-yellow-600 dark:text-yellow-400 font-medium">{metric.retryCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Degradation Info */}
      {metric.degradationTriggered && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded border border-yellow-200 dark:border-yellow-800">
          <div className="text-xs font-medium text-yellow-800 dark:text-yellow-300 mb-1">Degradation Triggered</div>
          <div className="text-sm text-yellow-700 dark:text-yellow-400">
            Mode: <span className="font-medium">{metric.degradationLevel}</span>
          </div>
        </div>
      )}
    </div>
  );
};
