import React from 'react';
import { Globe, Info, Key, Server, Shield } from 'lucide-react';
import { ApiProvider, AppConfig } from '../../types';

interface ApiSectionProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
}

const PROVIDERS: { value: ApiProvider; label: string }[] = [
  { value: 'google', label: 'Google (Gemini)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'xai', label: 'xAI' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
];

const ApiSection = ({ config, setConfig }: ApiSectionProps) => {
  return (
    <div className="space-y-4 pt-1">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">API & Keys</h3>

      <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-100">
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-xs text-blue-800">
            <p className="font-medium mb-1">Backend vs Upstream</p>
            <p>Backend URL is the DeepThink server you connect to. Upstream API is the LLM provider the backend calls (optional override).</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
            <Server size={14} className="text-slate-400" />
            Backend URL
          </label>
          <input
            type="text"
            placeholder="(empty = same origin)  http://localhost:8080"
            value={config.backendUrl || ''}
            onChange={(e) => setConfig({ ...config, backendUrl: e.target.value })}
            className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Shield size={14} className="text-slate-400" />
              Backend App Key (optional)
            </label>
            <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
              <input
                type="checkbox"
                checked={config.rememberAppApiKey ?? false}
                onChange={(e) => setConfig({ ...config, rememberAppApiKey: e.target.checked })}
                className="h-4 w-4"
              />
              Remember on this device
            </label>
          </div>
          <input
            type="password"
            placeholder="APP_API_KEY..."
            value={config.appApiKey || ''}
            onChange={(e) => setConfig({ ...config, appApiKey: e.target.value })}
            className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
          />
        </div>

        <div className="border-t border-slate-200 pt-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Upstream LLM Override</div>
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
            <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Provider</label>
                <select
                  value={(config.apiProvider || 'google') as ApiProvider}
                  onChange={(e) => setConfig({ ...config, apiProvider: e.target.value as ApiProvider })}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
                >
                  {PROVIDERS.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <Key size={14} className="text-slate-400" />
                    Upstream API Key
                  </label>
                  <label className="flex items-center gap-2 text-xs text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={config.rememberCustomApiKey ?? false}
                      onChange={(e) => setConfig({ ...config, rememberCustomApiKey: e.target.checked })}
                      className="h-4 w-4"
                    />
                    Remember on this device
                  </label>
                </div>
                <input
                  type="password"
                  placeholder="sk-..."
                  value={config.customApiKey || ''}
                  onChange={(e) => setConfig({ ...config, customApiKey: e.target.value })}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Globe size={14} className="text-slate-400" />
                  Upstream Base URL (optional)
                </label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={config.customBaseUrl || ''}
                  onChange={(e) => setConfig({ ...config, customBaseUrl: e.target.value })}
                  className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
                />
                <div className="text-[11px] text-slate-500">
                  Base URL must be allowed by backend allowlist (BASE_URL_ALLOWLIST).
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ApiSection;
