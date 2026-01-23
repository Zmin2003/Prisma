import React from 'react';
import { Globe, Key, Bot } from 'lucide-react';
import { AppConfig, ModelOption } from '../../types';

interface ApiSectionProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
  model: ModelOption;
  setModel: (m: ModelOption) => void;
}

const ApiSection = ({ config, setConfig, model, setModel }: ApiSectionProps) => {
  return (
    <div className="space-y-4 pt-1">
      <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
        Upstream API (OpenAI-compatible)
      </h3>

      <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Bot size={14} className="text-muted-foreground" />
            Model
          </label>
          <input
            type="text"
            placeholder="(empty = use backend default)"
            value={model || ''}
            onChange={(e) => setModel(e.target.value)}
            className="w-full bg-background border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-ring focus:border-ring block p-2.5 outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Globe size={14} className="text-muted-foreground" />
            Base URL (optional)
          </label>
          <input
            type="text"
            placeholder="https://api.openai.com/v1"
            value={config.customBaseUrl || ''}
            onChange={(e) => setConfig({ ...config, customBaseUrl: e.target.value })}
            className="w-full bg-background border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-ring focus:border-ring block p-2.5 outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground flex items-center gap-2">
            <Key size={14} className="text-muted-foreground" />
            API Key (optional)
          </label>
          <input
            type="password"
            placeholder="sk-..."
            value={config.customApiKey || ''}
            onChange={(e) => setConfig({ ...config, customApiKey: e.target.value })}
            className="w-full bg-background border border-border text-foreground text-sm rounded-lg focus:ring-2 focus:ring-ring focus:border-ring block p-2.5 outline-none placeholder:text-muted-foreground"
          />
        </div>
      </div>
    </div>
  );
};

export default ApiSection;
