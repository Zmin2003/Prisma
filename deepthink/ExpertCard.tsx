import React, { useState, useEffect } from 'react';
import { Bot, Loader2, CheckCircle2, X, BrainCircuit, MessageSquareText, Thermometer, Timer, Repeat, Settings2 } from 'lucide-react';
import MarkdownRenderer from './components/MarkdownRenderer';
import { ExpertResult } from './types';

// Simple component to format milliseconds to ss.ms or mm:ss
const TimeDisplay = ({ start, end, status }: { start?: number, end?: number, status: string }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;

    // Update live timer
    if (status === 'thinking' && start) {
      setElapsed(Date.now() - start);
      interval = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 500);
    }
    // Show final duration
    else if ((status === 'completed' || status === 'error') && start && end) {
      setElapsed(end - start);
    }
    else {
      setElapsed(0);
    }

    return () => clearInterval(interval);
  }, [status, start, end]);

  if (!start) return null;

  const seconds = (elapsed / 1000).toFixed(1);
  return (
    <div className="flex items-center gap-1 text-[10px] font-mono font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
      <Timer size={10} />
      <span>{seconds}s</span>
    </div>
  );
};

const ExpertCard = ({ expert }: { expert: ExpertResult }) => {
  const [view, setView] = useState<'thoughts' | 'output' | 'config'>('output');

  const isWorking = expert.status === 'thinking';
  const isDone = expert.status === 'completed';
  const isPending = expert.status === 'pending';
  const isError = expert.status === 'error';
  const round = expert.round || 1;

  // Auto-switch to thoughts if that's all we have so far
  React.useEffect(() => {
    if (isWorking && expert.thoughts && !expert.content) {
      setView('thoughts');
    } else if (expert.content && view === 'thoughts' && !expert.thoughts) {
      setView('output');
    }
  }, [expert.thoughts, expert.content, isWorking]);

  return (
    <div className={`
      relative flex flex-col h-80 rounded-2xl transition-all duration-500 overflow-hidden group
      ${isWorking ? 'bg-white shadow-glow ring-2 ring-primary/20 scale-[1.02]' : ''}
      ${isDone ? 'bg-white shadow-sm hover:shadow-md' : ''}
      ${isPending ? 'bg-secondary/30 border border-transparent' : ''}
      ${isError ? 'bg-red-50/50 border border-red-200' : ''}
    `}>
      {/* Header */}
      <div className={`p-4 flex items-start gap-3 border-b border-black/5 ${isWorking ? 'bg-primary/5' : ''}`}>
        <div className={`mt-0.5 p-2 rounded-xl transition-colors ${isWorking ? 'bg-white text-primary shadow-sm' :
            (isError ? 'bg-red-100 text-red-600' : 'bg-white/50 text-muted-foreground')
          }`}>
          <Bot size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground leading-tight truncate">{expert.role}</h3>
              {round > 1 && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-wider">
                  <Repeat size={10} />
                  <span>Round {round}</span>
                </div>
              )}
            </div>

            <TimeDisplay start={expert.startTime} end={expert.endTime} status={expert.status} />
          </div>

          <div className="flex items-center gap-2">
            <p className="text-[11px] text-muted-foreground truncate flex-1">{expert.description}</p>
            {expert.temperature !== undefined && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-secondary text-[10px] font-mono text-muted-foreground shrink-0" title={`Temperature: ${expert.temperature}`}>
                <Thermometer size={10} />
                <span>{expert.temperature}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 pt-1">
          {isWorking && <Loader2 size={16} className="animate-spin text-primary" />}
          {isDone && <CheckCircle2 size={16} className="text-green-500" />}
          {isError && <X size={16} className="text-red-500" />}
        </div>
      </div>

      {/* Tabs */}
      {!isPending && (
        <div className="flex border-b border-black/5 text-[10px] font-bold uppercase tracking-wider bg-secondary/20">
          <button
            onClick={() => setView('config')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-all ${view === 'config' ? 'bg-white text-primary shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}`}
          >
            <Settings2 size={12} />
            Config
          </button>
          <button
            onClick={() => setView('thoughts')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-all ${view === 'thoughts' ? 'bg-white text-blue-600 shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}`}
          >
            <BrainCircuit size={12} />
            Reasoning
          </button>
          <button
            onClick={() => setView('output')}
            className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 transition-all ${view === 'output' ? 'bg-white text-green-600 shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-black/5'}`}
          >
            <MessageSquareText size={12} />
            Output
          </button>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-5 bg-white/50">
        {isPending ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30">
            <div className="p-4 rounded-full bg-secondary/50 mb-3">
              <Bot size={24} className="opacity-50" />
            </div>
            <span className="text-xs font-medium uppercase tracking-widest">Waiting for assignment</span>
          </div>
        ) : (
          <div className="animate-fade-in-up">
            {view === 'config' && (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    <Thermometer size={10} />
                    Temperature
                  </div>
                  <div className="bg-secondary/50 px-3 py-2 rounded-lg border border-transparent text-sm font-mono text-foreground">
                    {expert.temperature ?? 0.7}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    <MessageSquareText size={10} />
                    Prompt
                  </div>
                  <div className="bg-secondary/50 px-3 py-2 rounded-lg border border-transparent text-muted-foreground text-xs leading-relaxed max-h-48 overflow-y-auto">
                    {expert.prompt || '暂无'}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-semibold uppercase text-[10px] tracking-wider">
                    <Bot size={10} />
                    Description
                  </div>
                  <div className="bg-secondary/50 px-3 py-2 rounded-lg border border-transparent text-muted-foreground text-xs leading-relaxed">
                    {expert.description || '暂无'}
                  </div>
                </div>
              </div>
            )}

            {view === 'thoughts' && (
              <div className="prose prose-xs max-w-none">
                {expert.thoughts ? (
                  <MarkdownRenderer
                    content={expert.thoughts}
                    className="text-muted-foreground font-mono text-xs leading-relaxed"
                  />
                ) : (
                  <span className="italic opacity-50 text-xs">Initializing thought process...</span>
                )}
                {isWorking && <span className="inline-block w-1.5 h-3 ml-1 bg-primary animate-pulse" />}
              </div>
            )}

            {view === 'output' && (
              <div className="prose prose-sm max-w-none">
                {expert.content ? (
                  <MarkdownRenderer
                    content={expert.content}
                    className="text-foreground text-sm leading-relaxed"
                  />
                ) : (
                  <span className="text-muted-foreground italic text-xs">
                    {isWorking ? "Formulating output..." : "No output generated."}
                  </span>
                )}
                {isWorking && !expert.content && <span className="inline-block w-1.5 h-3 ml-1 bg-green-500 animate-pulse" />}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ExpertCard;