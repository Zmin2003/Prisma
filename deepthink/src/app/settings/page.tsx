import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '../../stores/themeStore';
import { useConfigStore } from '../../stores/configStore';
import type { Theme, ThinkingLevel } from '../../types';

const THINKING_LEVELS: { value: ThinkingLevel; label: string }[] = [
  { value: 'minimal', label: 'Minimal' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const THEMES: { value: Theme; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <Sun size={16} /> },
  { value: 'dark', label: 'Dark', icon: <Moon size={16} /> },
  { value: 'system', label: 'System', icon: <Monitor size={16} /> },
];

export default function SettingsPage() {
  const { theme, setTheme } = useThemeStore();
  const {
    planningLevel,
    expertLevel,
    synthesisLevel,
    enableProcessStream,
    setConfig,
  } = useConfigStore();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center gap-4">
          <Link
            to="/"
            className="p-2 -ml-2 text-muted-foreground hover:bg-accent rounded-lg transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-lg font-semibold">Settings</h1>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Appearance
          </h2>
          <div className="bg-card rounded-lg border border-border p-4">
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="flex gap-2">
              {THEMES.map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => setTheme(value)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    theme === value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background border-border hover:bg-accent'
                  }`}
                >
                  {icon}
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Thinking Levels
          </h2>
          <div className="bg-card rounded-lg border border-border divide-y divide-border">
            {[
              { key: 'planningLevel', label: 'Planning', value: planningLevel },
              { key: 'expertLevel', label: 'Expert', value: expertLevel },
              { key: 'synthesisLevel', label: 'Synthesis', value: synthesisLevel },
            ].map(({ key, label, value }) => (
              <div key={key} className="p-4 flex items-center justify-between">
                <span className="text-sm font-medium">{label} Level</span>
                <select
                  value={value}
                  onChange={(e) =>
                    setConfig({ [key]: e.target.value as ThinkingLevel })
                  }
                  className="bg-background border border-border rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
                >
                  {THINKING_LEVELS.map((level) => (
                    <option key={level.value} value={level.value}>
                      {level.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
            Advanced
          </h2>
          <div className="bg-card rounded-lg border border-border p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-sm font-medium">Process Stream</span>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Show real-time thinking process
                </p>
              </div>
              <button
                onClick={() => setConfig({ enableProcessStream: !enableProcessStream })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  enableProcessStream ? 'bg-primary' : 'bg-muted'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    enableProcessStream ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
