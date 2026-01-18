
import { useState, useCallback, useEffect } from 'react';
import { ToastData, ToastType } from '../components/ErrorToast';
import { errorService, ErrorContext } from '../services/errorService';

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback((
    type: ToastType,
    title: string,
    message: string,
    options?: {
      duration?: number;
      errorContext?: ErrorContext;
      onRetry?: () => void;
      onViewDetails?: () => void;
    }
  ) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    const newToast: ToastData = {
      id,
      type,
      title,
      message,
      duration: options?.duration ?? (type === 'error' ? 0 : 5000),
      errorContext: options?.errorContext,
      onRetry: options?.onRetry,
      onViewDetails: options?.onViewDetails,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissToast = useCallback((id: string) => {
    removeToast(id);
  }, [removeToast]);

  const showError = useCallback((
    title: string,
    message: string,
    errorContext?: ErrorContext,
    onRetry?: () => void
  ) => {
    return addToast('error', title, message, {
      duration: 0,
      errorContext,
      onRetry,
    });
  }, [addToast]);

  const showSuccess = useCallback((
    title: string,
    message: string,
    duration?: number
  ) => {
    return addToast('success', title, message, { duration });
  }, [addToast]);

  const showWarning = useCallback((
    title: string,
    message: string,
    duration?: number
  ) => {
    return addToast('warning', title, message, { duration });
  }, [addToast]);

  const showInfo = useCallback((
    title: string,
    message: string,
    duration?: number
  ) => {
    return addToast('info', title, message, { duration });
  }, [addToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return {
    toasts,
    addToast,
    removeToast,
    dismissToast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    clearAll,
  };
};
