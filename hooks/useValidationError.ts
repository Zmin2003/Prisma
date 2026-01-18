
import { useState, useEffect, useCallback } from 'react';
import { errorService, ErrorContext } from '../services/errorService';
import { ValidationError, mapToUISeverity } from '../services/validationService';

export interface ValidationErrorState {
  error: ErrorContext | null;
  isVisible: boolean;
}

/**
 * Hook to manage validation error display
 * Listens to errorService and shows ErrorCard for critical config errors
 */
export const useValidationError = () => {
  const [errorState, setErrorState] = useState<ValidationErrorState>({
    error: null,
    isVisible: false
  });

  // Listen for config errors that should show as cards
  useEffect(() => {
    const unsubscribe = errorService.addListener((error: ErrorContext, errorId: string) => {
      // Only show card for Config category with critical/high severity
      if (error.category === 'Config' && (error.severity === 'critical' || error.severity === 'high')) {
        // Check if this is a validation error that should show as card
        const validationCodes = [
          'MODEL_NOT_FOUND',
          'API_KEY_REQUIRED',
          'BASE_URL_REQUIRED',
          'BASE_URL_INVALID',
          'BASE_URL_PROTOCOL_INVALID'
        ];

        if (error.code && validationCodes.includes(error.code)) {
          setErrorState({
            error,
            isVisible: true
          });
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const dismissError = useCallback(() => {
    setErrorState(prev => ({
      ...prev,
      isVisible: false
    }));
  }, []);

  const clearError = useCallback(() => {
    setErrorState({
      error: null,
      isVisible: false
    });
  }, []);

  return {
    validationError: errorState.error,
    isErrorVisible: errorState.isVisible,
    dismissError,
    clearError
  };
};

export default useValidationError;
