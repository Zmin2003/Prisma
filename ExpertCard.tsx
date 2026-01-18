import React, { useState, useEffect } from 'react';
import { Bot, Loader2, CheckCircle2, X, BrainCircuit, MessageSquareText, Thermometer, Timer, Repeat, RefreshCw, AlertCircle, Clock } from 'lucide-react';
import MarkdownRenderer from './components/MarkdownRenderer';
import { ExpertResult } from './types';

// Simple component to format milliseconds to ss.ms or mm:ss
const TimeDisplay = ({ start, end, status }: { start?: number, end?: number, status: string }) => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: any;

    // Update live timer
    if (status === 'thinking' && start) {
      // Calculate initial diff immediately
      setElapsed(Date.now() - start);
      interval = setInterval(() => {
        setElapsed(Date.now() - start);
      }, 100);
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

const RetryStatusBadge = ({ expert }: { expert: ExpertResult }) => {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (expert.status === 'retrying' && expert.retryStatus?.nextRetryDelay) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, expert.retryStatus!.nextRetryDelay! - (Date.now() - (expert.endTime || Date.now())));
        setCountdown(remaining);
      }, 100);
      return () => clearInterval(interval);
    }
  }, [expert.status, expert.retryStatus, expert.endTime]);

  if (!expert.retryStatus || expert.status !== 'retrying') return null;

  const { attempt, maxRetries, errorType } = expert.retryStatus;
  const errorIcons = {
    network: <AlertCircle size={10} />,
    api: <X size={10} />,
    client: <AlertCircle size={10} />,
    unknown: <AlertCircle size={10} />
  };

  return (
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-100 border border-amber-300 text-amber-800">
      <RefreshCw size={10} className="animate-spin" />
      <span className="text-[9px] font-bold uppercase tracking-wider">
        Retry {attempt}/{maxRetries}
      </span>
      {errorType && (
        <div className="flex items-center gap-0.5" title={`Error type: ${errorType}`}>
          {errorIcons[errorType]}
        </div>
      )}
      {countdown > 0 && (
        <div className="flex items-center gap-0.5 text-[9px] font-mono">
          <Clock size={8} />
          <span>{(countdown / 1000).toFixed(1)}s</span>
        </div>
      )}
    </div>
  );
};

const ExpertCard = ({ expert }: { expert: ExpertResult }) => {
  const [view, setView] = useState<'thoughts' | 'output'>('output');

  const isWorking = expert.status === 'thinking';
  const isDone = expert.status === 'completed';
  const isPending = expert.status === 'pending';
  const isError = expert.status === 'error';
  const isRetrying = expert.status === 'retrying';
  const isTimeout = expert.status === 'timeout';
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
      relative flex flex-col h-80 rounded-xl border transition-all duration-300 shadow-sm overflow-hidden
      ${isWorking ? 'border-blue-400 bg-white shadow-[0_0_15px_rgba(59,130,246,0.1)]' : ''}
      ${isDone ? 'border-emerald-400 bg-white' : ''}
      ${isPending ? 'border-slate-200 bg-slate-50/50' : ''}
      ${isError ? 'border-red-400 bg-red-50' : ''}
      ${isRetrying ? 'border-amber-400 bg-amber-50/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : ''}
      ${isTimeout ? 'border-orange-400 bg-orange-50' : ''}
    `}>
      {/* Header */}
      <div className={`p-3 border-b flex items-start gap-3 ${isDone ? 'bg-emerald-50/30 border-emerald-100' : isRetrying ? 'bg-amber-50/30 border-amber-100' : 'bg-slate-50/50 border-slate-100'}`}>
        <div className={`mt-0.5 p-1.5 rounded-lg ${isWorking ? 'bg-blue-100 text-blue-600' : isRetrying ? 'bg-amber-100 text-amber-600' : (isError || isTimeout ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600')}`}>
          <Bot size={18} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-0.5">
            <div className="flex items-center gap-2 flex-wrap">
               <h3 className="text-sm font-bold text-slate-800 leading-tight truncate">{expert.role}</h3>
               {round > 1 && (
                 <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-indigo-100 text-indigo-700 text-[9px] font-bold uppercase tracking-wider border border-indigo-200">
                    <Repeat size={8} />
                    Round {round}
                 </div>
               )}
               {/* Retry Status Badge */}
               <RetryStatusBadge expert={expert} />
            </div>

            {/* Timer for Expert */}
            <TimeDisplay start={expert.startTime} end={expert.endTime} status={expert.status} />
          </div>
          
          <div className="flex items-center gap-2">
            <p className="text-[10px] text-slate-500 truncate flex-1">{expert.description}</p>
            {expert.temperature !== undefined && (
              <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-200/50 border border-slate-200 text-[9px] font-mono text-slate-500 shrink-0" title={`Temperature: ${expert.temperature}`}>
                <Thermometer size={8} />
                <span>{expert.temperature}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex-shrink-0 pt-0.5">
          {isWorking && <Loader2 size={16} className="animate-spin text-blue-600" />}
          {isDone && <CheckCircle2 size={16} className="text-emerald-600" />}
          {isError && <X size={16} className="text-red-600" />}
          {isRetrying && <RefreshCw size={16} className="animate-spin text-amber-600" />}
          {isTimeout && <Clock size={16} className="text-orange-600" />}
        </div>
      </div>

      {/* Tabs */}
      {!isPending && (
        <div className="flex border-b border-slate-100 text-[10px] font-medium uppercase tracking-wider">
          <button 
            onClick={() => setView('thoughts')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${view === 'thoughts' ? 'bg-slate-100 text-slate-800 border-b-2 border-blue-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <BrainCircuit size={12} />
            Reasoning
          </button>
          <button 
            onClick={() => setView('output')}
            className={`flex-1 py-2 flex items-center justify-center gap-1.5 transition-colors ${view === 'output' ? 'bg-white text-slate-800 border-b-2 border-emerald-500' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
          >
            <MessageSquareText size={12} />
            Output
          </button>
        </div>
      )}
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar bg-white">
        {isPending ? (
           <div className="h-full flex flex-col items-center justify-center text-slate-300">
             <Bot size={32} className="mb-2 opacity-50" />
             <span className="text-xs italic">Waiting for assignment...</span>
           </div>
        ) : (
          <>
            {view === 'thoughts' && (
              <div className="prose prose-xs max-w-none">
                {expert.thoughts ? (
                  <MarkdownRenderer 
                    content={expert.thoughts} 
                    className="text-slate-500 font-mono text-[11px] leading-relaxed" 
                  />
                ) : (
                  <span className="italic opacity-50 text-[11px]">Initializing thought process...</span>
                )}
                {isWorking && <span className="inline-block w-1.5 h-3 ml-1 bg-blue-400 animate-pulse"/>}
              </div>
            )}
            
            {view === 'output' && (
              <div className="prose prose-sm max-w-none">
                {expert.content ? (
                   <MarkdownRenderer 
                    content={expert.content} 
                    className="text-slate-700 text-xs leading-relaxed" 
                   />
                ) : (
                  <span className="text-slate-400 italic text-[11px]">
                    {isWorking ? "Formulating output..." : "No output generated."}
                  </span>
                )}
                 {isWorking && !expert.content && <span className="inline-block w-1.5 h-3 ml-1 bg-emerald-400 animate-pulse"/>}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ExpertCard;