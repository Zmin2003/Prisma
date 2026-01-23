import React, { useState, useEffect } from 'react';
import { Settings, ChevronDown, Menu, Moon, Sun, RefreshCw } from 'lucide-react';
import { ModelOption, AppConfig } from '../types';
import { listModels, BackendModel } from '../api';
import Logo from './Logo';
import { useThemeStore } from '../src/stores/themeStore';

interface HeaderProps {
  selectedModel: ModelOption;
  setSelectedModel: (model: ModelOption) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
  config: AppConfig;
}

const Header = ({ selectedModel, setSelectedModel, onOpenSettings, onToggleSidebar, onNewChat, config }: HeaderProps) => {
  const [backendModels, setBackendModels] = useState<BackendModel[]>([]);
  const [loading, setLoading] = useState(false);
  const { theme, setTheme, getEffectiveTheme } = useThemeStore();
  const effectiveTheme = getEffectiveTheme();

  const fetchModels = async () => {
    setLoading(true);
    try {
      const models = await listModels({ backendUrl: config.backendUrl, appApiKey: config.appApiKey });
      setBackendModels(models);
      if (!selectedModel && models.length > 0) {
        setSelectedModel(models[0].id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, [config.backendUrl, config.appApiKey]);

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b-0">
      <div className="w-full px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-muted-foreground hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 rounded-full transition-all"
            title="Toggle Sidebar"
          >
            <Menu size={22} />
          </button>

          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={onNewChat}
            title="Start New Chat"
          >
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 blur-lg rounded-full group-hover:bg-primary/30 transition-all opacity-0 group-hover:opacity-100" />
              <Logo className="w-9 h-9 relative z-10 transition-transform group-hover:rotate-12 duration-500 ease-out" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              Deep<span className="font-light text-foreground/70">Think</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative group flex items-center gap-2">
            {backendModels.length > 0 ? (
              <div className="relative">
                <input
                  list="deepthink-models"
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value as ModelOption)}
                  placeholder="Model ID..."
                  className="bg-secondary/50 hover:bg-secondary border border-transparent hover:border-primary/20 text-foreground text-sm rounded-full py-2 pl-4 pr-10 outline-none font-medium transition-all shadow-sm focus:ring-2 focus:ring-primary/20"
                />
                <datalist id="deepthink-models">
                  {backendModels.map(m => (
                    <option key={m.id} value={m.id} />
                  ))}
                </datalist>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" size={14} />
              </div>
            ) : (
              <button
                onClick={onOpenSettings}
                className="text-sm text-muted-foreground border border-dashed border-border rounded-lg px-3 py-2 hover:bg-accent transition-colors"
              >
                + Add Model
              </button>
            )}
            <button
              onClick={fetchModels}
              disabled={loading}
              className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-all"
              title="Refresh models"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="w-px h-6 bg-border/50 mx-2" />

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            title="Toggle Theme"
          >
            {effectiveTheme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            title="Configuration"
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
