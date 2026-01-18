/**
 * Retry Utility for API calls
 * Implements exponential backoff and handles transient errors (429, 5xx).
 */

export type ErrorType = 'network' | 'api' | 'client' | 'unknown';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  backoffMultiplier: number;
}

export interface RetryStatus {
  attempt: number;
  maxRetries: number;
  errorType: ErrorType;
  nextRetryDelay?: number;
}

export type RetryStatusCallback = (status: RetryStatus) => void;

/**
 * Classify error type for retry strategy selection
 */
export function classifyError(error: any): ErrorType {
  const status = error?.status || error?.response?.status;
  const message = error?.message || "";

  // Network errors (no status code)
  if (!status) {
    if (message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('fetch') ||
        message.toLowerCase().includes('timeout')) {
      return 'network';
    }
    return 'unknown';
  }

  // API errors (429, 5xx)
  if (status === 429 || (status >= 500 && status < 600)) {
    return 'api';
  }

  // Client errors (4xx except 429)
  if (status >= 400 && status < 500) {
    return 'client';
  }

  return 'unknown';
}

/**
 * Determine if error is retryable
 */
export function isRetryableError(errorType: ErrorType): boolean {
  return errorType === 'network' || errorType === 'api';
}

/**
 * Enhanced retry function with error classification and status callbacks
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1500,
  backoffMultiplier: number = 2,
  onRetryStatus?: RetryStatusCallback
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      const errorType = classifyError(error);
      const isRetryable = isRetryableError(errorType);

      // If we reached max retries or the error isn't retryable, throw immediately
      if (attempt === maxRetries || !isRetryable) {
        console.error(`[Prisma] Final attempt ${attempt} failed:`, error);

        if (onRetryStatus) {
          onRetryStatus({
            attempt,
            maxRetries,
            errorType,
            nextRetryDelay: undefined
          });
        }

        throw error;
      }

      // Calculate delay with exponential backoff
      const delay = initialDelay * Math.pow(backoffMultiplier, attempt - 1);

      console.warn(
        `[Prisma] API call failed (Attempt ${attempt}/${maxRetries}). ` +
        `Error Type: ${errorType}. Retrying in ${delay}ms...`
      );

      if (onRetryStatus) {
        onRetryStatus({
          attempt,
          maxRetries,
          errorType,
          nextRetryDelay: delay
        });
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Maximum retries reached without success");
}
