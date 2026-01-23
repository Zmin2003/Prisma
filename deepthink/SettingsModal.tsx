
import React, { useEffect, useRef, useCallback } from 'react';
import { Settings, X } from 'lucide-react';
import { AppConfig, ModelOption } from './types';
import ApiSection from './components/settings/ApiSection';
import SearchToolSection from './components/settings/SearchToolSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  model: ModelOption;
  setModel: (m: ModelOption) => void;
}

const SettingsModal = ({ 
  isOpen, 
  onClose, 
  config, 
  setConfig, 
  model,
  setModel
}: SettingsModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
      return;
    }

    if (e.key === 'Tab' && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement?.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement?.focus();
      }
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement;
      document.body.style.overflow = 'hidden';
      document.addEventListener('keydown', handleKeyDown);

      setTimeout(() => {
        const firstFocusable = modalRef.current?.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        firstFocusable?.focus();
      }, 0);
    }

    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', handleKeyDown);
      previousActiveElement.current?.focus();
    };
  }, [isOpen, handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-card border border-border rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/50">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-primary" />
            <h2 id="settings-modal-title" className="font-semibold text-foreground">Configuration</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-muted-foreground hover:text-foreground transition-colors rounded-full p-1 hover:bg-muted"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <ApiSection config={config} setConfig={setConfig} model={model} setModel={setModel} />
          <SearchToolSection config={config} setConfig={setConfig} />
        </div>

        {/* Footer */}
        <div className="p-4 bg-muted/50 border-t border-border flex justify-end shrink-0">
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-medium rounded-lg transition-all shadow-md active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
