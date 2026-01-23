import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ChatSession, ChatMessage, ModelOption } from '../types';

interface ChatState {
  sessions: ChatSession[];
  currentSessionId: string | null;
  
  getSessions: () => ChatSession[];
  getSession: (id: string) => ChatSession | undefined;
  getCurrentSession: () => ChatSession | undefined;
  
  createSession: (initialMessages: ChatMessage[], model: ModelOption) => string;
  updateSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;
  deleteSession: (id: string) => void;
  setCurrentSessionId: (id: string | null) => void;
  clearCurrentSession: () => void;
  clearAll: () => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      getSessions: () => get().sessions,
      
      getSession: (id) => get().sessions.find((s) => s.id === id),
      
      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return currentSessionId ? sessions.find((s) => s.id === currentSessionId) : undefined;
      },

      createSession: (initialMessages, model) => {
        const newId = Date.now().toString();
        const title =
          initialMessages[0].content.slice(0, 40) +
          (initialMessages[0].content.length > 40 ? '...' : '');

        const newSession: ChatSession = {
          id: newId,
          title,
          messages: initialMessages,
          createdAt: Date.now(),
          model,
        };

        set((state) => ({
          sessions: [newSession, ...state.sessions],
          currentSessionId: newId,
        }));

        return newId;
      },

      updateSessionMessages: (sessionId, messages) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === sessionId ? { ...s, messages } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSessionId: state.currentSessionId === id ? null : state.currentSessionId,
        })),

      setCurrentSessionId: (id) => set({ currentSessionId: id }),
      
      clearCurrentSession: () => set({ currentSessionId: null }),
      
      clearAll: () => set({ sessions: [], currentSessionId: null }),
    }),
    { name: 'deepthink-sessions' }
  )
);
