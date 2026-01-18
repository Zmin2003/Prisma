
import React, { useState } from 'react';
import { Key, Globe, Info, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { AppConfig } from '../../types';
import { validateApiKey, validateBaseUrl } from '../../config';
import { testApiConnection } from '../../api';

interface ApiSectionProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
}

const ApiSection = ({ config, setConfig }: ApiSectionProps) => {
  const [apiKeyError, setApiKeyError] = useState<string>('');
  const [baseUrlError, setBaseUrlError] = useState<string>('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  const handleApiKeyChange = (value: string) => {
    setConfig({ ...config, customApiKey: value });
    setApiKeyError('');
    setTestStatus('idle');
  };

  const handleBaseUrlChange = (value: string) => {
    setConfig({ ...config, customBaseUrl: value });
    setBaseUrlError('');
    setTestStatus('idle');
  };

  const handleTestConnection = async () => {
    const apiKey = config.customApiKey || '';
    const baseUrl = config.customBaseUrl || '';

    setApiKeyError('');
    setBaseUrlError('');

    const keyValidation = validateApiKey(apiKey, config.apiProvider || 'google');
    if (!keyValidation.isValid) {
      setApiKeyError(keyValidation.error || 'Invalid API Key');
      return;
    }

    if (baseUrl) {
      const urlValidation = validateBaseUrl(baseUrl);
      if (!urlValidation.isValid) {
        setBaseUrlError(urlValidation.error || 'Invalid Base URL');
        return;
      }
    }

    setTestStatus('testing');
    setTestMessage('');

    const result = await testApiConnection(
      config.apiProvider || 'google',
      apiKey,
      baseUrl || undefined
    );

    if (result.success) {
      setTestStatus('success');
      setTestMessage(result.message || 'Connection successful');
    } else {
      setTestStatus('error');
      setTestMessage(result.error || 'Connection failed');
    }
  };
  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between mb-2">
         <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Default API Connection</h3>
         <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={config.enableCustomApi ?? false}
              onChange={(e) => setConfig({ ...config, enableCustomApi: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
         </label>
      </div>

      {config.enableCustomApi && (
        <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-100 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-800">
              <p className="font-medium mb-1">Custom Model Configuration</p>
              <p>Each custom model can now be configured with its own API key and base URL in the Custom Models section below. This default configuration is used for preset models.</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Key size={14} className="text-slate-400" />
              Default API Key
            </label>
            <input
              type="password"
              placeholder="sk-..."
              value={config.customApiKey || ''}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              className={`w-full bg-white border text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400 ${
                apiKeyError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'
              }`}
            />
            {apiKeyError && (
              <div className="flex items-start gap-2 text-xs text-red-600">
                <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{apiKeyError}</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Globe size={14} className="text-slate-400" />
              Default Base URL
            </label>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              value={config.customBaseUrl || ''}
              onChange={(e) => handleBaseUrlChange(e.target.value)}
              className={`w-full bg-white border text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400 ${
                baseUrlError ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : 'border-slate-200'
              }`}
            />
            {baseUrlError && (
              <div className="flex items-start gap-2 text-xs text-red-600">
                <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{baseUrlError}</span>
              </div>
            )}
          </div>

          <div className="pt-2">
            <button
              onClick={handleTestConnection}
              disabled={testStatus === 'testing' || !config.customApiKey}
              className="w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
            >
              {testStatus === 'testing' ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Testing Connection...
                </>
              ) : (
                'Test Connection'
              )}
            </button>

            {testStatus === 'success' && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-green-50 rounded-lg border border-green-200 animate-in fade-in slide-in-from-top-1 duration-200">
                <CheckCircle size={16} className="text-green-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-green-800">
                  <p className="font-medium">{testMessage}</p>
                  <p className="text-xs mt-1">Your API configuration is working correctly.</p>
                </div>
              </div>
            )}

            {testStatus === 'error' && (
              <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-200 animate-in fade-in slide-in-from-top-1 duration-200">
                <XCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-800">
                  <p className="font-medium">{testMessage}</p>
                  <p className="text-xs mt-1">Please verify your API key and base URL, then try again.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ApiSection;
