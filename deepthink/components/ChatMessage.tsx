
import React, { useState } from 'react';
import { User, Sparkles, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react';
import MarkdownRenderer from './MarkdownRenderer';
import ProcessFlow from './ProcessFlow';
import { ChatMessage } from '../types';

interface ChatMessageProps {
  message: ChatMessage;
  isLast?: boolean;
}

const ChatMessageItem = ({ message, isLast }: ChatMessageProps) => {
  const isUser = message.role === 'user';
  const [showThinking, setShowThinking] = useState(false);
  const [copied, setCopied] = useState(false);

  // Check if there is any thinking data to show
  const hasThinkingData = message.analysis || (message.experts && message.experts.length > 0);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`group w-full ${isUser ? 'bg-transparent' : 'bg-secondary/30 border-y border-white/5'}`}>
      <div className="max-w-4xl mx-auto px-6 py-10 flex gap-6 md:gap-8">
        {/* Avatar */}
        <div className="flex-shrink-0 flex flex-col relative items-end">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-transform hover:scale-105 ${isUser
              ? 'bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 text-slate-600 dark:text-slate-200'
              : 'bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-glow'
            }`}>
            {isUser ? (
              <User size={20} />
            ) : (
              <Sparkles size={20} />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="font-bold text-sm text-foreground/80">
              {isUser ? 'You' : 'DeepThink'}
            </div>
            {message.content && (
              <button
                onClick={handleCopy}
                className={`p-2 rounded-lg transition-all duration-200 flex items-center gap-1.5
                  ${copied
                    ? 'text-green-600 bg-green-50'
                    : 'text-muted-foreground hover:text-foreground hover:bg-black/5 opacity-0 group-hover:opacity-100 focus:opacity-100'
                  }`}
                title="Copy message"
              >
                {copied ? (
                  <>
                    <Check size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Copied</span>
                  </>
                ) : (
                  <Copy size={16} />
                )}
              </button>
            )}
          </div>

          {/* Thinking Process Accordion (Only for AI) */}
          {!isUser && hasThinkingData && (
            <div className="mb-6">
              <button
                onClick={() => setShowThinking(!showThinking)}
                className={`
                  flex items-center gap-3 text-xs font-semibold px-4 py-3 rounded-xl transition-all w-full md:w-auto
                  ${showThinking
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'bg-white dark:bg-black/20 text-muted-foreground border border-black/5 hover:border-primary/30 hover:text-primary'}
                `}
              >
                {message.isThinking ? (
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    <span>Thinking Process...</span>
                  </div>
                ) : (
                  <span>Thought for {((message.totalDuration || 0) / 1000).toFixed(1)}s</span>
                )}
                {showThinking ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>

              {showThinking && (
                <div className="mt-3 p-5 bg-white/50 dark:bg-black/10 border border-black/5 rounded-2xl shadow-inner animate-fade-in-up">
                  <ProcessFlow
                    appState={message.isThinking ? 'experts_working' : 'completed'}
                    managerAnalysis={message.analysis || null}
                    experts={message.experts || []}
                    synthesisThoughts={message.synthesisThoughts}
                    defaultExpanded={true}
                  />
                </div>
              )}
            </div>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {message.attachments.map(att => (
                <img
                  key={att.id}
                  src={att.url || `data:${att.mimeType};base64,${att.data}`}
                  alt="attachment"
                  className="h-48 w-auto object-cover rounded-2xl border border-black/5 shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => window.open(att.url || `data:${att.mimeType};base64,${att.data}`, '_blank')}
                />
              ))}
            </div>
          )}

          {/* Text Content */}
          <div className="prose prose-slate dark:prose-invert max-w-none 
            prose-p:leading-7 prose-p:text-foreground/90
            prose-headings:font-bold prose-headings:tracking-tight prose-headings:text-foreground
            prose-pre:bg-slate-900 prose-pre:text-slate-50 prose-pre:rounded-xl prose-pre:shadow-lg
            prose-strong:text-foreground prose-strong:font-bold
            prose-a:text-primary prose-a:font-medium hover:prose-a:underline
          ">
            {message.content ? (
              <MarkdownRenderer content={message.content} />
            ) : (
              message.isThinking && <span className="inline-block w-2 h-5 bg-primary animate-pulse rounded-full" />
            )}
          </div>

          {/* Internal Monologue (Synthesis Thoughts) - Optional Footer */}
          {!isUser && message.synthesisThoughts && (
            <div className="mt-8 pt-6 border-t border-black/5">
              <details className="group/thoughts">
                <summary className="cursor-pointer list-none text-xs font-medium text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors select-none">
                  <div className="p-1 rounded bg-secondary group-open/thoughts:bg-primary/10 group-open/thoughts:text-primary transition-colors">
                    <ChevronRight size={12} className="group-open/thoughts:rotate-90 transition-transform duration-200" />
                  </div>
                  Show Internal Monologue
                </summary>
                <div className="mt-3 text-xs font-mono text-muted-foreground bg-secondary/30 p-4 rounded-xl border border-transparent group-open/thoughts:border-black/5 whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar animate-fade-in-up">
                  {message.synthesisThoughts}
                </div>
              </details>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessageItem;
