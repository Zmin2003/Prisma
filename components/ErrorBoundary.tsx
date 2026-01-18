
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { errorService } from '../services/errorService';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo, reset: () => void) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: Array<string | number>;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    errorService.report({
      category: 'System',
      severity: 'critical',
      message: error.message,
      code: 'REACT_ERROR_BOUNDARY',
      timestamp: Date.now(),
      stack: error.stack,
      metadata: {
        componentStack: errorInfo.componentStack
      },
      userMessage: 'Application encountered an unexpected error',
      actionable: true,
      suggestedAction: 'Try refreshing the page or return to home'
    });

    this.setState({
      errorInfo
    });

    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (this.state.hasError && this.props.resetKeys) {
      const hasResetKeyChanged = this.props.resetKeys.some(
        (key, index) => key !== prevProps.resetKeys?.[index]
      );

      if (hasResetKeyChanged) {
        this.reset();
      }
    }
  }

  reset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  handleRefresh = (): void => {
    window.location.reload();
  };

  handleGoHome = (): void => {
    window.location.href = '/';
  };

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(
          this.state.error,
          this.state.errorInfo!,
          this.reset
        );
      }

      return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-lg shadow-xl p-8">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">
                  Something went wrong
                </h1>
                <p className="text-gray-600 mb-4">
                  The application encountered an unexpected error. This has been logged and we'll look into it.
                </p>

                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <h2 className="text-sm font-semibold text-red-900 mb-2">
                    Error Details
                  </h2>
                  <p className="text-sm text-red-800 font-mono break-all">
                    {this.state.error.message}
                  </p>
                </div>

                {this.state.errorInfo && (
                  <details className="mb-6">
                    <summary className="text-sm font-medium text-gray-700 cursor-pointer hover:text-gray-900 mb-2">
                      Technical Details (for developers)
                    </summary>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 overflow-auto max-h-64">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap">
                        {this.state.error.stack}
                      </pre>
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap mt-2">
                        {this.state.errorInfo.componentStack}
                      </pre>
                    </div>
                  </details>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={this.reset}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </button>

                  <button
                    onClick={this.handleRefresh}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Refresh Page
                  </button>

                  <button
                    onClick={this.handleGoHome}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </button>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="text-sm font-semibold text-blue-900 mb-2">
                    What you can do:
                  </h3>
                  <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                    <li>Try clicking "Try Again" to retry the operation</li>
                    <li>Refresh the page to restart the application</li>
                    <li>Check your internet connection</li>
                    <li>Clear your browser cache and reload</li>
                    <li>If the problem persists, contact support</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
