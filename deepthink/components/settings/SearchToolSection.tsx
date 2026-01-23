import React from 'react';
import { Search, Globe } from 'lucide-react';
import { AppConfig } from '../../types';

interface SearchToolSectionProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
}

const SearchToolSection = ({ config, setConfig }: SearchToolSectionProps) => {
  const toolConfig = config.toolConfig || {
    enableWebSearch: false,
    webSearchProvider: 'auto',
    nativeWeb: false,
    maxSearchResults: 5
  };

  const handleChange = (updates: Partial<typeof toolConfig>) => {
    setConfig({
      ...config,
      toolConfig: { ...toolConfig, ...updates }
    });
  };

  return (
    <div className="space-y-4 pt-1">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Search Tools</h3>

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-slate-500" />
            <div>
              <div className="text-sm font-medium text-slate-700">Web Search</div>
              <div className="text-xs text-slate-500">Enable Tavily/DuckDuckGo search</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={toolConfig.enableWebSearch}
              onChange={(e) => handleChange({ enableWebSearch: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {toolConfig.enableWebSearch && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Provider</label>
              <select
                value={toolConfig.webSearchProvider}
                onChange={(e) => handleChange({ webSearchProvider: e.target.value as 'tavily' | 'duckduckgo' | 'auto' })}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
              >
                <option value="auto">Auto (Tavily if available)</option>
                <option value="tavily">Tavily</option>
                <option value="duckduckgo">DuckDuckGo</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Max Results</label>
              <input
                type="number"
                min={1}
                max={20}
                value={toolConfig.maxSearchResults}
                onChange={(e) => handleChange({ maxSearchResults: parseInt(e.target.value) || 5 })}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-200">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-slate-500" />
            <div>
              <div className="text-sm font-medium text-slate-700">Native Web Browsing</div>
              <div className="text-xs text-slate-500">Use Gemini's native grounding (if supported)</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={toolConfig.nativeWeb}
              onChange={(e) => handleChange({ nativeWeb: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>
    </div>
  );
};

export default SearchToolSection;
