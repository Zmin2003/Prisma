
import React, { useRef, useLayoutEffect, useState, useEffect, useCallback } from 'react';
import { ArrowUp, Square, Paperclip, X, Image as ImageIcon, File, FileText, Code, Database } from 'lucide-react';
import { AppState, MessageAttachment, AttachmentType } from '../types';
import { fileUploadService, formatFileSize, getAttachmentType, getMimeType } from '../services/fileUploadService';

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
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  // Get icon for file type
  const getFileIcon = (type: AttachmentType) => {
    switch (type) {
      case 'image':
        return <ImageIcon size={14} className="text-blue-500" />;
      case 'document':
        return <FileText size={14} className="text-orange-500" />;
      case 'code':
        return <Code size={14} className="text-green-500" />;
      case 'data':
        return <Database size={14} className="text-purple-500" />;
      default:
        return <File size={14} className="text-gray-500" />;
    }
  };

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

  const processFile = useCallback(async (file: File) => {
    // Validate file
    const validation = fileUploadService.validateFile(file);
    if (!validation.valid) {
      console.error("File validation failed:", validation.error);
      return;
    }

    try {
      const result = await fileUploadService.uploadFile(file);
      if (result.success && result.attachment) {
        setAttachments(prev => [...prev, result.attachment!]);
      } else {
        console.error("Failed to process file:", result.error);
      }
    } catch (e) {
      console.error("Failed to process file", e);
    }
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (appState !== 'idle') return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      Array.from(files).forEach(processFile);
    }
  }, [appState, processFile]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      const file = items[i].getAsFile();
      if (file) {
        e.preventDefault();
        processFile(file);
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
    const att = attachments.find(a => a.id === id);
    if (att?.url) {
      fileUploadService.revokeObjectUrl(att.url);
    }
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
    <div
      className="w-full"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drag overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-blue-500/10 backdrop-blur-sm border-2 border-dashed border-blue-500 rounded-[26px] pointer-events-none">
          <div className="text-center">
            <Paperclip className="w-8 h-8 text-blue-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-600">Drop files here</p>
          </div>
        </div>
      )}

      {/* Attachments Preview */}
      {attachments.length > 0 && (
        <div className="flex gap-2 mb-2 overflow-x-auto px-1 py-1">
          {attachments.map(att => (
            <div key={att.id} className="relative group shrink-0">
              {att.type === 'image' && att.url ? (
                <img
                  src={att.url}
                  alt={att.fileName || 'attachment'}
                  className="h-16 w-16 object-cover rounded-lg border border-slate-200 shadow-sm"
                />
              ) : (
                <div className="h-16 w-16 flex flex-col items-center justify-center rounded-lg border border-slate-200 shadow-sm bg-slate-50">
                  {getFileIcon(att.type)}
                  <span className="text-[10px] text-slate-500 mt-1 px-1 truncate max-w-full">
                    {att.fileName?.split('.').pop()?.toUpperCase() || 'FILE'}
                  </span>
                </div>
              )}
              {att.fileName && (
                <div className="absolute -bottom-1 left-0 right-0 text-[9px] text-center text-slate-500 truncate px-0.5">
                  {att.fileName.length > 10 ? att.fileName.substring(0, 8) + '...' : att.fileName}
                </div>
              )}
              <button
                onClick={() => removeAttachment(att.id)}
                className="absolute -top-1.5 -right-1.5 bg-slate-900 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Container */}
      <div className={`w-full flex items-end p-2 bg-white/70 backdrop-blur-xl border rounded-[26px] shadow-2xl focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:bg-white/90 transition-colors duration-200 ${isDragging ? 'border-blue-500' : 'border-slate-200/50'}`}>

        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept={fileUploadService.getSupportedExtensions()}
          multiple
          onChange={handleFileSelect}
        />

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex-shrink-0 p-2.5 mb-0.5 ml-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          title="Attach files (images, documents, code, data)"
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
          placeholder="Ask a complex question..."
          rows={1}
          autoFocus
          className="flex-1 max-h-[200px] py-3 pl-2 pr-2 bg-transparent border-none focus:ring-0 resize-none outline-none text-slate-800 placeholder:text-slate-400 leading-relaxed custom-scrollbar text-base"
          style={{ minHeight: '48px' }}
        />

        <div className="flex-shrink-0 pb-0.5 pr-0.5">
          {isRunning ? (
            <button
              onClick={onStop}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-900 text-white hover:bg-slate-700 transition-colors shadow-md"
            >
              <Square size={14} className="fill-current" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!query.trim() && attachments.length === 0}
              className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-600 text-white hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 transition-all shadow-md hover:scale-105 active:scale-95"
            >
              <ArrowUp size={20} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InputSection;
