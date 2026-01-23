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
      const models = await listModels();
      setBackendModels(models);
      if (models.length > 0 && !models.some(m => m.id === selectedModel)) {
        setSelectedModel(models[0].id);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  const toggleTheme = () => {
    setTheme(effectiveTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 bg-background/80 dark:bg-background/90 backdrop-blur-md border-b border-border">
      <div className="w-full px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
            title="Toggle History"
          >
            <Menu size={20} />
          </button>

          <div
            className="flex items-center gap-3 cursor-pointer group"
            onClick={onNewChat}
            title="Start New Chat"
          >
            <Logo className="w-8 h-8 transition-transform group-hover:scale-110" />
            <h1 className="font-bold text-lg tracking-tight text-primary group-hover:opacity-70 transition-opacity">
              <span className="font-light">DeepThink</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative group flex items-center gap-1">
            {backendModels.length > 0 ? (
              <>
                <select
                  value={backendModels.some(m => m.id === selectedModel) ? selectedModel : backendModels[0]?.id || ''}
                  onChange={(e) => setSelectedModel(e.target.value as ModelOption)}
                  className="relative bg-background border border-border text-foreground text-sm rounded-lg focus:ring-ring focus:border-ring block w-auto p-2.5 outline-none appearance-none cursor-pointer pl-3 pr-8 shadow-sm font-medium hover:bg-accent transition-colors"
                >
                  {backendModels.map(m => (
                    <option key={m.id} value={m.id}>{m.id}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-3 text-muted-foreground pointer-events-none group-hover:text-foreground transition-colors" size={14} />
              </>
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
              className="p-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
              title="Refresh models"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-lg bg-background border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shadow-sm"
            title="Toggle Theme"
          >
            {effectiveTheme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>

          <button
            onClick={onOpenSettings}
            className="p-2.5 rounded-lg bg-background border border-border hover:bg-accent transition-colors text-muted-foreground hover:text-foreground shadow-sm"
            title="Configuration"
          >
            <Settings size={18} />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Header;
