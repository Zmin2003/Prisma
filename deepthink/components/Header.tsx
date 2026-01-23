import React from 'react';
import { Settings, Menu, Moon, Sun, Monitor } from 'lucide-react';
import Logo from './Logo';
import { useThemeStore } from '../src/stores/themeStore';

interface HeaderProps {
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}

const Header = ({ onOpenSettings, onToggleSidebar, onNewChat }: HeaderProps) => {
  const { theme, setTheme, getEffectiveTheme } = useThemeStore();

  const cycleTheme = () => {
    const order = ['light', 'dark', 'system'] as const;
    const currentIndex = order.indexOf(theme);
    const nextIndex = (currentIndex + 1) % order.length;
    setTheme(order[nextIndex]);
  };

  const getThemeIcon = () => {
    if (theme === 'system') return <Monitor size={20} />;
    if (theme === 'dark') return <Moon size={20} />;
    return <Sun size={20} />;
  };

  return (
    <header className="sticky top-0 z-50 glass-panel border-b-0">
      <div className="w-full px-6 h-16 flex items-center justify-between">
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
              <Logo className="w-8 h-8 relative z-10 transition-transform group-hover:rotate-12 duration-500 ease-out" />
            </div>
            <h1 className="font-bold text-lg tracking-tight text-foreground/90 group-hover:text-primary transition-colors">
              Deep<span className="font-light text-foreground/70">Think</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={cycleTheme}
            className="p-2.5 rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground transition-all"
            title={`Theme: ${theme}`}
          >
            {getThemeIcon()}
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
