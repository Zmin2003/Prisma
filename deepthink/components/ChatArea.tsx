
import React from 'react';
import { ChatMessage, AppState, AnalysisResult, ExpertResult } from '../types';
import ChatMessageItem from './ChatMessage';
import ProcessFlow from './ProcessFlow';
import Logo from './Logo';
import { Sparkles, Brain, Users, Zap } from 'lucide-react';

interface ChatAreaProps {
  messages: ChatMessage[];
  appState: AppState;
  managerAnalysis: AnalysisResult | null;
  experts: ExpertResult[];
  finalOutput: string;
  synthesisThoughts?: string;
  processStartTime: number | null;
  processEndTime: number | null;
}

const ChatArea = ({
  messages,
  appState,
  managerAnalysis,
  experts,
  finalOutput,
  synthesisThoughts,
  processStartTime,
  processEndTime
}: ChatAreaProps) => {
  const isIdle = messages.length === 0 && appState === 'idle';

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
      {isIdle ? (
        <div className="h-full flex flex-col items-center justify-center px-4 text-center bg-gradient-hero">
          <div className="max-w-2xl mx-auto">
            <div className="animate-float mb-8">
              <Logo className="w-28 h-28 mx-auto drop-shadow-2xl" />
            </div>
            
            <h1 className="text-3xl font-bold text-gradient-primary mb-3">
              DeepThink
            </h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto mb-10">
              Deep multi-agent reasoning powered by specialized AI experts
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
              <div className="group bg-card/80 dark:bg-card/50 backdrop-blur-sm rounded-xl p-5 border border-border card-hover cursor-default">
                <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-3 mx-auto group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50 transition-colors">
                  <Brain size={20} className="text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">Deep Analysis</h3>
                <p className="text-xs text-muted-foreground">Breaks down complex problems into manageable parts</p>
              </div>
              
              <div className="group bg-card/80 dark:bg-card/50 backdrop-blur-sm rounded-xl p-5 border border-border card-hover cursor-default">
                <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mb-3 mx-auto group-hover:bg-violet-200 dark:group-hover:bg-violet-900/50 transition-colors">
                  <Users size={20} className="text-violet-600 dark:text-violet-400" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">Expert Collaboration</h3>
                <p className="text-xs text-muted-foreground">Multiple AI specialists work together</p>
              </div>
              
              <div className="group bg-card/80 dark:bg-card/50 backdrop-blur-sm rounded-xl p-5 border border-border card-hover cursor-default">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-3 mx-auto group-hover:bg-emerald-200 dark:group-hover:bg-emerald-900/50 transition-colors">
                  <Sparkles size={20} className="text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold text-foreground text-sm mb-1">Quality Synthesis</h3>
                <p className="text-xs text-muted-foreground">Combines insights for comprehensive answers</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Zap size={14} className="text-amber-500" />
              <span>Start typing below to begin</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="pb-40">
          {/* History */}
          {messages.map((msg, idx) => (
            <ChatMessageItem 
              key={msg.id ?? `msg-${idx}`} 
              message={msg} 
              isLast={idx === messages.length - 1} 
            />
          ))}

          {/* Active Generation (Ghost Message) */}
          {appState !== 'idle' && appState !== 'completed' && (
            <div className="group w-full bg-transparent text-foreground">
              <div className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-card border border-primary/20 shadow-sm flex items-center justify-center">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-foreground mb-2">DeepThink</div>
                  
                  {/* Active Thinking Process */}
                  <div className="mb-4 bg-card border border-primary/10 rounded-xl p-4 shadow-sm">
                    <ProcessFlow 
                      appState={appState} 
                      managerAnalysis={managerAnalysis} 
                      experts={experts}
                      synthesisThoughts={synthesisThoughts}
                      processStartTime={processStartTime}
                      processEndTime={processEndTime}
                    />
                  </div>

                  {/* Streaming Output - plain text for performance */}
                  {finalOutput && (
                    <div className="whitespace-pre-wrap font-sans text-sm text-foreground leading-relaxed">
                      {finalOutput}
                      <span className="inline-block w-2 h-4 ml-1 bg-primary/60 animate-pulse" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatArea;
