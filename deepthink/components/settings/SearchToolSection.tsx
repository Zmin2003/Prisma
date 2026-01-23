import React from 'react';
import { Search } from 'lucide-react';
import { AppConfig } from '../../types';

interface SearchToolSectionProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
}

const SearchToolSection = ({ config, setConfig }: SearchToolSectionProps) => {
  const toolConfig = config.toolConfig || {
    enableWebSearch: false,
    webSearchProvider: 'auto',
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
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Search Tools</h3>

      <div className="p-4 bg-muted/50 rounded-lg border border-border space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Search size={16} className="text-muted-foreground" />
            <div>
              <div className="text-sm font-medium text-foreground">Web Search</div>
              <div className="text-xs text-muted-foreground">Enable Tavily/DuckDuckGo search</div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={toolConfig.enableWebSearch}
              onChange={(e) => handleChange({ enableWebSearch: e.target.checked })}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
          </label>
        </div>

        {toolConfig.enableWebSearch && (
          <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Provider</label>
              <select
                value={toolConfig.webSearchProvider}
                onChange={(e) => handleChange({ webSearchProvider: e.target.value as 'tavily' | 'duckduckgo' | 'auto' })}
                className="w-full bg-background border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-ring focus:border-ring block p-2.5 outline-none"
              >
                <option value="auto">Auto (Tavily if available)</option>
                <option value="tavily">Tavily</option>
                <option value="duckduckgo">DuckDuckGo</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max Results</label>
              <input
                type="number"
                min={1}
                max={20}
                value={toolConfig.maxSearchResults}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 5;
                  handleChange({ maxSearchResults: Math.max(1, Math.min(20, val)) });
                }}
                className="w-full bg-background border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-ring focus:border-ring block p-2.5 outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchToolSection;
