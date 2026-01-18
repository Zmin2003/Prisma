
import React, { useState } from 'react';
import { Settings, X, AlertCircle } from 'lucide-react';
import { AppConfig, ModelOption } from './types';
import ApiSection from './components/settings/ApiSection';
import ModelSection from './components/settings/ModelSection';
import ThinkingSection from './components/settings/ThinkingSection';
import { validateApiKey, validateBaseUrl } from './config';

import LogSection from './components/settings/LogSection';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  model: ModelOption;
}

const SettingsModal = ({
  isOpen,
  onClose,
  config,
  setConfig,
  model
}: SettingsModalProps) => {
  const [validationError, setValidationError] = useState<string>('');

  if (!isOpen) return null;

  const handleClose = () => {
    if (config.enableCustomApi) {
      const apiKey = config.customApiKey || '';
      const baseUrl = config.customBaseUrl || '';

      if (!apiKey.trim()) {
        setValidationError('API Key is required when custom API is enabled');
        return;
      }

      const keyValidation = validateApiKey(apiKey, config.apiProvider || 'google');
      if (!keyValidation.isValid) {
        setValidationError(keyValidation.error || 'Invalid API Key format');
        return;
      }

      if (baseUrl) {
        const urlValidation = validateBaseUrl(baseUrl);
        if (!urlValidation.isValid) {
          setValidationError(urlValidation.error || 'Invalid Base URL format');
          return;
        }
      }
    }

    setValidationError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Settings size={18} className="text-blue-600" />
            <h2 className="font-semibold text-slate-800">Configuration</h2>
          </div>
          <button onClick={handleClose} className="text-slate-400 hover:text-slate-700 transition-colors rounded-full p-1 hover:bg-slate-200/50">
            <X size={20} />
          </button>
        </div>
        
        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar">
          <ModelSection config={config} setConfig={setConfig} />
          <ApiSection config={config} setConfig={setConfig} />

          <ThinkingSection
            config={config}
            setConfig={setConfig}
            model={model}
          />
          
          <LogSection />


        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
          {validationError && (
            <div className="mb-3 flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
              <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium">{validationError}</p>
                <p className="text-xs mt-1">Please fix the configuration errors before closing.</p>
              </div>
            </div>
          )}
          <div className="flex justify-end">
            <button
              onClick={handleClose}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-all shadow-md active:scale-95"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
