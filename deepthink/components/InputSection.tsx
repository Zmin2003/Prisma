
import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';
import { ArrowUp, Square, Paperclip, X, Image as ImageIcon } from 'lucide-react';
import { AppState, MessageAttachment } from '../types';
import { fileToBase64 } from '../utils';

interface InputSectionProps {
  query: string;
  setQuery: (q: string) => void;
  onRun: (attachments: MessageAttachment[]) => void;
  onStop: () => void;
  appState: AppState;
  focusTrigger?: number;
}

const InputSection = ({ query, setQuery, onRun, onStop, appState, focusTrigger }: InputSectionProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [attachments, setAttachments] = useState<MessageAttachment[]>([]);

  const adjustHeight = () => {
    if (textareaRef.current) {
      // Reset height to auto to allow shrinking when text is deleted
      textareaRef.current.style.height = 'auto';

      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 200;

      // Set new height based on scrollHeight, capped at 200px
      textareaRef.current.style.height = `${Math.min(scrollHeight, maxHeight)}px`;

      // Only show scrollbar if we hit the max height limit
      if (scrollHeight > maxHeight) {
        textareaRef.current.style.overflowY = 'auto';
      } else {
        textareaRef.current.style.overflowY = 'hidden';
      }
    }
  };

  // Focus input on mount and when app becomes idle
  useEffect(() => {
    if (appState === 'idle' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [appState, focusTrigger]);

  // useLayoutEffect prevents visual flickering by adjusting height before paint
  useLayoutEffect(() => {
    adjustHeight();
  }, [query]);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    try {
      const base64 = await fileToBase64(file);
      const newAttachment: MessageAttachment = {
        id: Math.random().toString(36).substring(7),
        type: 'image',
        mimeType: file.type,
        data: base64,
        url: URL.createObjectURL(file)
      };
      setAttachments(prev => [...prev, newAttachment]);
    } catch (e) {
      console.error("Failed to process file", e);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          processFile(file);
        }
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      Array.from(e.target.files).forEach(processFile);
    }
    // Reset input so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      if (isComposing || (e.nativeEvent as any).isComposing) {
        return;
      }
      e.preventDefault();
      if ((query.trim() || attachments.length > 0) && appState === 'idle') {
        handleSubmit();
      }
    }
  };

  const handleSubmit = () => {
    if (!query.trim() && attachments.length === 0) return;
    onRun(attachments);
    setAttachments([]);
  };

  const isRunning = appState !== 'idle';

  return (
    <div className="w-full">
      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-3 mb-3 overflow-x-auto px-1 py-1 custom-scrollbar">
          {attachments.map(att => (
            <div key={att.id} className="relative group shrink-0 animate-fade-in-up">
              <img
                src={att.url}
                alt="attachment"
                className="h-20 w-20 object-cover rounded-xl border border-white/20 shadow-lg"
              />
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-all shadow-md hover:scale-110"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Container */}
      <div className="relative w-full group">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-violet-500/10 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />

        <div className="relative flex items-end p-2 bg-white/80 dark:bg-black/40 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-[28px] shadow-2xl transition-colors duration-200">

          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleFileSelect}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-shrink-0 p-3 mb-0.5 ml-1 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
            title="Attach Image"
            disabled={isRunning}
          >
            <Paperclip size={20} />
          </button>

          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="Ask anything complex..."
            rows={1}
            autoFocus
            className="flex-1 max-h-[200px] py-3.5 px-3 bg-transparent border-none focus:ring-0 resize-none outline-none text-foreground placeholder:text-muted-foreground leading-relaxed custom-scrollbar text-base"
            style={{ minHeight: '52px' }}
          />

          <div className="flex-shrink-0 pb-1 pr-1">
            {isRunning ? (
              <button
                onClick={onStop}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 text-white hover:bg-slate-800 transition-all shadow-md hover:shadow-lg hover:scale-105"
              >
                <Square size={12} className="fill-current" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!query.trim() && attachments.length === 0}
                className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-primary to-violet-600 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-primary/30 hover:scale-105 active:scale-95"
              >
                <ArrowUp size={20} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputSection;
