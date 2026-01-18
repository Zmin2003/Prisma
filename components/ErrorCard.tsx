
import React, { useState } from 'react';
import { AlertCircle, X, Settings, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { ErrorContext } from '../services/errorService';
import { ValidationError } from '../services/validationService';

export interface ErrorCardProps {
  error: ErrorContext | ValidationError;
  onClose?: () => void;
  onOpenSettings?: () => void;
  onRetry?: () => void;
}

const ErrorCard: React.FC<ErrorCardProps> = ({
  error,
  onClose,
  onOpenSettings,
  onRetry
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Normalize error to common format
  const isValidationError = 'field' in error;
  const errorCode = isValidationError ? (error as ValidationError).code : (error as ErrorContext).code;
  const errorMessage = isValidationError ? (error as ValidationError).message : (error as ErrorContext).userMessage || (error as ErrorContext).message;
  const suggestedAction = isValidationError ? (error as ValidationError).suggestedAction : (error as ErrorContext).suggestedAction;
  const field = isValidationError ? (error as ValidationError).field : undefined;

  // Get severity-based styling
  const getSeverityStyles = () => {
    if (isValidationError) {
      return {
        bg: 'bg-red-50',
        border: 'border-red-300',
        icon: 'text-red-600',
        title: 'text-red-900',
        text: 'text-red-700'
      };
    }

    const severity = (error as ErrorContext).severity;
    switch (severity) {
      case 'critical':
        return {
          bg: 'bg-red-50',
          border: 'border-red-300',
          icon: 'text-red-600',
          title: 'text-red-900',
          text: 'text-red-700'
        };
      case 'high':
        return {
          bg: 'bg-orange-50',
          border: 'border-orange-300',
          icon: 'text-orange-600',
          title: 'text-orange-900',
          text: 'text-orange-700'
        };
      default:
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          icon: 'text-yellow-600',
          title: 'text-yellow-900',
          text: 'text-yellow-700'
        };
    }
  };

  const styles = getSeverityStyles();

  // Get error title based on code
  const getErrorTitle = () => {
    switch (errorCode) {
      case 'MODEL_NOT_FOUND':
        return 'Model Not Configured';
      case 'API_KEY_REQUIRED':
        return 'API Key Required';
      case 'API_KEY_FORMAT_INVALID':
        return 'Invalid API Key Format';
      case 'BASE_URL_REQUIRED':
        return 'Base URL Required';
      case 'BASE_URL_INVALID':
        return 'Invalid Base URL';
      case 'BASE_URL_PROTOCOL_INVALID':
        return 'Invalid URL Protocol';
      default:
        return 'Configuration Error';
    }
  };

  return (
    <div className={`${styles.bg} ${styles.border} border-2 rounded-xl shadow-lg p-5 max-w-lg mx-auto`}>
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className={`flex-shrink-0 p-2 rounded-full ${styles.bg}`}>
          <AlertCircle className={`w-6 h-6 ${styles.icon}`} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className={`font-bold text-lg ${styles.title}`}>
              {getErrorTitle()}
            </h3>
            {onClose && (
              <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors p-1"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Error Code Badge */}
          {errorCode && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-mono bg-white/50 rounded border border-gray-200">
              {errorCode}
            </span>
          )}
        </div>
      </div>

      {/* Error Message */}
      <div className="mt-4">
        <p className={`text-sm ${styles.text}`}>
          {errorMessage}
        </p>

        {field && (
          <p className="mt-2 text-xs text-gray-500">
            Field: <code className="px-1 py-0.5 bg-gray-100 rounded">{field}</code>
          </p>
        )}
      </div>

      {/* Suggested Action */}
      {suggestedAction && (
        <div className="mt-4 p-3 bg-white/70 rounded-lg border border-gray-200">
          <p className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <ExternalLink className="w-4 h-4" />
            Suggested Action
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {suggestedAction}
          </p>
        </div>
      )}

      {/* Expandable Details (for ErrorContext) */}
      {!isValidationError && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors"
        >
          {isExpanded ? (
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
      )}

      {isExpanded && !isValidationError && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-xs space-y-1">
          <div>
            <span className="font-medium">Category:</span>{' '}
            <span className="text-gray-600">{(error as ErrorContext).category}</span>
          </div>
          <div>
            <span className="font-medium">Severity:</span>{' '}
            <span className="text-gray-600">{(error as ErrorContext).severity}</span>
          </div>
          {(error as ErrorContext).phase && (
            <div>
              <span className="font-medium">Phase:</span>{' '}
              <span className="text-gray-600">{(error as ErrorContext).phase}</span>
            </div>
          )}
          <div>
            <span className="font-medium">Time:</span>{' '}
            <span className="text-gray-600">
              {new Date((error as ErrorContext).timestamp).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-5 flex items-center gap-3">
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
          >
            <Settings className="w-4 h-4" />
            Open Settings
          </button>
        )}

        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors"
          >
            Try Again
          </button>
        )}

        {onClose && !onOpenSettings && !onRetry && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-lg border border-gray-300 transition-colors"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorCard;
