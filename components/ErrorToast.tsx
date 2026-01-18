
import React, { useState, useEffect } from 'react';
import { X, AlertCircle, CheckCircle, Info, AlertTriangle, ChevronDown, ChevronUp, RotateCw } from 'lucide-react';
import { ErrorContext } from '../services/errorService';

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  message: string;
  duration?: number;
  errorContext?: ErrorContext;
  onRetry?: () => void;
  onViewDetails?: () => void;
}

interface ErrorToastProps {
  toast: ToastData;
  onClose: (id: string) => void;
  onDismiss: (id: string) => void;
}

const ErrorToast: React.FC<ErrorToastProps> = ({ toast, onClose, onDismiss }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration, toast.id]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose(toast.id);
    }, 300);
  };

  const handleDismiss = () => {
    onDismiss(toast.id);
    handleClose();
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'info':
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getTitleColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-900';
      case 'warning':
        return 'text-yellow-900';
      case 'error':
        return 'text-red-900';
      case 'info':
        return 'text-blue-900';
    }
  };

  const getMessageColor = () => {
    switch (toast.type) {
      case 'success':
        return 'text-green-700';
      case 'warning':
        return 'text-yellow-700';
      case 'error':
        return 'text-red-700';
      case 'info':
        return 'text-blue-700';
    }
  };

  return (
    <div
      className={`
        ${getStyles()}
        border rounded-lg shadow-lg p-4 mb-3 min-w-[320px] max-w-md
        transition-all duration-300 ease-in-out
        ${isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
      `}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h4 className={`font-semibold text-sm ${getTitleColor()}`}>
              {toast.title}
            </h4>
            <button
              onClick={handleClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className={`text-sm mt-1 ${getMessageColor()}`}>
            {toast.message}
          </p>

          {toast.errorContext && (
            <>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <span className="ml-2 text-gray-600">{toast.errorContext.category}</span>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Severity:</span>
                      <span className="ml-2 text-gray-600">{toast.errorContext.severity}</span>
                    </div>
                    {toast.errorContext.code && (
                      <div>
                        <span className="font-medium text-gray-700">Code:</span>
                        <span className="ml-2 text-gray-600">{toast.errorContext.code}</span>
                      </div>
                    )}
                    {toast.errorContext.phase && (
                      <div>
                        <span className="font-medium text-gray-700">Phase:</span>
                        <span className="ml-2 text-gray-600">{toast.errorContext.phase}</span>
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Time:</span>
                      <span className="ml-2 text-gray-600">
                        {new Date(toast.errorContext.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    {toast.errorContext.suggestedAction && (
                      <div className="mt-2 p-2 bg-white rounded border border-gray-200">
                        <span className="font-medium text-gray-700">Suggested Action:</span>
                        <p className="mt-1 text-gray-600">{toast.errorContext.suggestedAction}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 mt-3">
                {toast.errorContext.actionable && toast.onRetry && (
                  <button
                    onClick={toast.onRetry}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    Retry
                  </button>
                )}

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white hover:bg-gray-100 rounded border border-gray-300 transition-colors"
                >
                  {isExpanded ? (
                    <>
                      <ChevronUp className="w-3 h-3" />
                      Hide Details
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-3 h-3" />
                      View Details
                    </>
                  )}
                </button>

                <button
                  onClick={handleDismiss}
                  className="ml-auto px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </>
          )}

          {!toast.errorContext && toast.onRetry && (
            <div className="flex items-center gap-2 mt-3">
              <button
                onClick={toast.onRetry}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-100 hover:bg-blue-200 rounded transition-colors"
              >
                <RotateCw className="w-3 h-3" />
                Retry
              </button>
              <button
                onClick={handleDismiss}
                className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorToast;
