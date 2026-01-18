
import React from 'react';
import ErrorToast, { ToastData } from './ErrorToast';

interface ToastContainerProps {
  toasts: ToastData[];
  onClose: (id: string) => void;
  onDismiss: (id: string) => void;
}

const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onClose, onDismiss }) => {
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className="pointer-events-auto">
        {toasts.map((toast) => (
          <ErrorToast
            key={toast.id}
            toast={toast}
            onClose={onClose}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </div>
  );
};

export default ToastContainer;
