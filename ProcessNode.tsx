import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, ChevronUp, ChevronDown, Clock, AlertCircle } from 'lucide-react';

interface ProcessNodeProps {
  icon: React.ElementType;
  title: string;
  status: 'idle' | 'active' | 'completed';
  children?: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  timeoutMs?: number;
  startTime?: number;
}

const TimeoutCountdown = ({ timeoutMs, startTime }: { timeoutMs: number; startTime: number }) => {
  const [remaining, setRemaining] = useState(timeoutMs);

  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const left = Math.max(0, timeoutMs - elapsed);
      setRemaining(left);
    }, 100);

    return () => clearInterval(interval);
  }, [timeoutMs, startTime]);

  const seconds = (remaining / 1000).toFixed(1);
  const percentage = (remaining / timeoutMs) * 100;
  const isWarning = percentage < 30;
  const isCritical = percentage < 10;

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1 text-xs font-mono">
        <Clock size={12} className={isCritical ? 'text-red-500' : isWarning ? 'text-amber-500' : 'text-blue-500'} />
        <span className={isCritical ? 'text-red-600 font-bold' : isWarning ? 'text-amber-600' : 'text-slate-600'}>
          {seconds}s
        </span>
      </div>
      <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-blue-500'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const ProcessNode = ({
  icon: Icon,
  title,
  status,
  children,
  isExpanded,
  onToggle,
  timeoutMs,
  startTime
}: ProcessNodeProps) => {
  const isActive = status === 'active';
  const isCompleted = status === 'completed';

  return (
    <div className={`relative z-10 rounded-xl border ${isActive ? 'border-blue-400 bg-blue-50/50' : 'border-slate-200 bg-white'} transition-all duration-500 overflow-hidden shadow-sm`}>
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50"
        onClick={onToggle}
      >
        <div className="flex items-center gap-3 flex-1">
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center transition-colors duration-300
            ${isActive ? 'bg-blue-600 text-white animate-pulse' : ''}
            ${isCompleted ? 'bg-green-600 text-white' : 'bg-slate-100 text-slate-400'}
          `}>
            {isActive ? <Loader2 size={16} className="animate-spin" /> : (isCompleted ? <CheckCircle2 size={16} /> : <Icon size={16} />)}
          </div>
          <div className="flex-1">
            <h3 className={`text-sm font-semibold ${isActive ? 'text-blue-900' : (isCompleted ? 'text-slate-800' : 'text-slate-500')}`}>
              {title}
            </h3>
            {isActive && <p className="text-xs text-blue-600">Processing...</p>}
          </div>
          {isActive && timeoutMs && startTime && (
            <TimeoutCountdown timeoutMs={timeoutMs} startTime={startTime} />
          )}
        </div>
        {children && (
          <div className="text-slate-400 hover:text-slate-700 ml-2">
            {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        )}
      </div>

      {isExpanded && children && (
        <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-in slide-in-from-top-2 duration-300">
          {children}
        </div>
      )}
    </div>
  );
};

export default ProcessNode;