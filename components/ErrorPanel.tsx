
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, AlertTriangle, Info, CheckCircle, ChevronDown, ChevronUp, Trash2, Filter } from 'lucide-react';
import { errorService, ErrorContext, ErrorCategory, ErrorSeverity } from '../services/errorService';

interface ErrorPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

const ErrorPanel: React.FC<ErrorPanelProps> = ({ isOpen, onClose }) => {
  const [errors, setErrors] = useState<ErrorContext[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ErrorCategory | 'all'>('all');
  const [selectedSeverity, setSelectedSeverity] = useState<ErrorSeverity | 'all'>('all');
  const [expandedErrors, setExpandedErrors] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (isOpen) {
      loadErrors();
    }
  }, [isOpen, selectedCategory, selectedSeverity]);

  const loadErrors = () => {
    let allErrors = errorService.getRecentErrors(50);

    if (selectedCategory !== 'all') {
      allErrors = allErrors.filter(e => e.category === selectedCategory);
    }

    if (selectedSeverity !== 'all') {
      allErrors = allErrors.filter(e => e.severity === selectedSeverity);
    }

    setErrors(allErrors);
  };

  const handleClearHistory = () => {
    if (confirm('Are you sure you want to clear all error history?')) {
      errorService.clearHistory();
      setErrors([]);
    }
  };

  const toggleExpanded = (index: number) => {
    const newExpanded = new Set(expandedErrors);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedErrors(newExpanded);
  };

  const getSeverityIcon = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertTriangle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <Info className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <CheckCircle className="w-5 h-5 text-blue-600" />;
    }
  };

  const getSeverityColor = (severity: ErrorSeverity) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900';
      case 'high':
        return 'bg-orange-50 border-orange-200 text-orange-900';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900';
      case 'low':
        return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  const getCategoryBadgeColor = (category: ErrorCategory) => {
    switch (category) {
      case 'API':
        return 'bg-purple-100 text-purple-800';
      case 'Network':
        return 'bg-blue-100 text-blue-800';
      case 'Config':
        return 'bg-red-100 text-red-800';
      case 'DeepThink':
        return 'bg-indigo-100 text-indigo-800';
      case 'User':
        return 'bg-green-100 text-green-800';
      case 'System':
        return 'bg-gray-100 text-gray-800';
    }
  };

  const stats = errorService.getStats();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Error History</h2>
            <p className="text-sm text-gray-600 mt-1">
              Total: {stats.total} errors | Critical: {stats.criticalCount}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">Filters:</span>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value as ErrorCategory | 'all')}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="API">API</option>
                <option value="Network">Network</option>
                <option value="Config">Config</option>
                <option value="DeepThink">DeepThink</option>
                <option value="User">User</option>
                <option value="System">System</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Severity:</label>
              <select
                value={selectedSeverity}
                onChange={(e) => setSelectedSeverity(e.target.value as ErrorSeverity | 'all')}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>

            <button
              onClick={handleClearHistory}
              className="ml-auto flex items-center gap-2 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear History
            </button>
          </div>
        </div>

        {/* Error List */}
        <div className="flex-1 overflow-y-auto p-4">
          {errors.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <CheckCircle className="w-16 h-16 mb-4 text-gray-300" />
              <p className="text-lg font-medium">No errors found</p>
              <p className="text-sm">Your application is running smoothly</p>
            </div>
          ) : (
            <div className="space-y-3">
              {errors.map((error, index) => (
                <div
                  key={index}
                  className={`border rounded-lg p-4 ${getSeverityColor(error.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5">
                      {getSeverityIcon(error.severity)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`px-2 py-1 text-xs font-semibold rounded ${getCategoryBadgeColor(error.category)}`}>
                            {error.category}
                          </span>
                          <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-200 text-gray-700">
                            {error.severity.toUpperCase()}
                          </span>
                          {error.code && (
                            <span className="px-2 py-1 text-xs font-mono rounded bg-gray-100 text-gray-600">
                              {error.code}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {new Date(error.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-sm font-medium mb-1">
                        {error.userMessage || error.message}
                      </p>

                      {error.suggestedAction && (
                        <div className="mt-2 p-2 bg-white bg-opacity-50 rounded border border-current border-opacity-20">
                          <p className="text-xs font-semibold mb-1">Suggested Action:</p>
                          <p className="text-xs">{error.suggestedAction}</p>
                        </div>
                      )}

                      {(error.stack || error.metadata) && (
                        <>
                          <button
                            onClick={() => toggleExpanded(index)}
                            className="flex items-center gap-1 mt-3 text-xs font-medium hover:underline"
                          >
                            {expandedErrors.has(index) ? (
                              <>
                                <ChevronUp className="w-3 h-3" />
                                Hide Details
                              </>
                            ) : (
                              <>
                                <ChevronDown className="w-3 h-3" />
                                Show Details
                              </>
                            )}
                          </button>

                          {expandedErrors.has(index) && (
                            <div className="mt-3 pt-3 border-t border-current border-opacity-20">
                              {error.phase && (
                                <div className="mb-2">
                                  <span className="text-xs font-semibold">Phase:</span>
                                  <span className="ml-2 text-xs">{error.phase}</span>
                                </div>
                              )}
                              {error.metadata && (
                                <div className="mb-2">
                                  <span className="text-xs font-semibold">Metadata:</span>
                                  <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto max-h-32">
                                    {JSON.stringify(error.metadata, null, 2)}
                                  </pre>
                                </div>
                              )}
                              {error.stack && (
                                <div>
                                  <span className="text-xs font-semibold">Stack Trace:</span>
                                  <pre className="mt-1 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto max-h-48 whitespace-pre-wrap">
                                    {error.stack}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div className="flex gap-4">
              <span>API: {stats.byCategory.API}</span>
              <span>Network: {stats.byCategory.Network}</span>
              <span>Config: {stats.byCategory.Config}</span>
              <span>DeepThink: {stats.byCategory.DeepThink}</span>
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ErrorPanel;
