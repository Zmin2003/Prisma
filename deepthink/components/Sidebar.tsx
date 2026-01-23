import React from 'react';
import { Plus, MessageSquare, Trash2, X, History, Sparkles } from 'lucide-react';
import { ChatSession } from '../types';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
}

const Sidebar = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession
}: SidebarProps) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 dark:bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-40
        w-[300px] bg-muted/50 dark:bg-black/20 backdrop-blur-xl border-r border-white/10 dark:border-white/5
        transform transition-all duration-300 ease-out
        ${isOpen ? 'translate-x-0 opacity-100' : '-translate-x-full lg:translate-x-0 lg:w-0 lg:opacity-0 lg:overflow-hidden'}
        flex flex-col h-full shadow-lg lg:shadow-none
      `}>

        {/* Header */}
        <div className="p-6 pb-2 shrink-0 flex items-center justify-between">
          <div className="flex items-center gap-2 text-foreground/80 font-bold tracking-tight text-sm uppercase">
            <History size={16} className="text-primary" />
            <span>History</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-muted-foreground hover:text-foreground p-1 hover:bg-black/5 rounded-md">
            <X size={18} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 py-3 shrink-0">
          <button
            onClick={() => {
              onNewChat();
              if (window.innerWidth < 1024) onClose();
            }}
            className="group w-full flex items-center justify-center gap-2 bg-white dark:bg-white/5 hover:bg-primary hover:text-white dark:hover:bg-primary text-foreground border border-border hover:border-primary/50 py-3 px-4 rounded-xl transition-all shadow-sm hover:shadow-lg hover:shadow-primary/20 font-medium text-sm"
          >
            <Plus size={16} className="group-hover:scale-110 transition-transform" />
            New Thread
          </button>
        </div>

        {/* Session List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-3 pb-4 space-y-1">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4 opacity-60">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 flex items-center justify-center mb-4 animate-float">
                <Sparkles size={24} className="text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">No conversations</p>
              <p className="text-xs text-muted-foreground text-center">Start a new chat to begin</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => {
                  onSelectSession(session.id);
                  if (window.innerWidth < 1024) onClose();
                }}
                className={`
                  group relative flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-200
                  ${currentSessionId === session.id
                    ? 'bg-white dark:bg-white/10 shadow-sm border border-border/50 text-foreground'
                    : 'text-muted-foreground hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'}
                `}
              >
                <div className={`p-1.5 rounded-lg shrink-0 transition-colors ${currentSessionId === session.id ? 'bg-primary/10 text-primary' : 'bg-transparent text-muted-foreground group-hover:text-foreground'}`}>
                  <MessageSquare size={16} />
                </div>

                <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                  <h4 className={`text-sm font-medium truncate pr-6 ${currentSessionId === session.id ? 'text-foreground' : 'text-foreground/80'}`}>{session.title}</h4>
                  <span className="text-[10px] text-muted-foreground/70">
                    {new Date(session.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <button
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive text-muted-foreground/60 transition-all"
                  title="Delete Chat"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;