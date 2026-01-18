
import React, { useState, useRef, useCallback } from 'react';
import { Upload, X, File, Image, FileText, Code, Database, AlertCircle, CheckCircle } from 'lucide-react';
import { MessageAttachment, AttachmentType } from '../types';
import {
  fileUploadService,
  FileUploadProgress,
  formatFileSize,
  getAttachmentType,
  getMimeType
} from '../services/fileUploadService';

interface FileUploadProps {
  onFilesUploaded: (attachments: MessageAttachment[]) => void;
  disabled?: boolean;
  maxFiles?: number;
  className?: string;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: FileUploadProgress;
}

const FileUpload: React.FC<FileUploadProps> = ({
  onFilesUploaded,
  disabled = false,
  maxFiles = 10,
  className = ''
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounterRef = useRef(0);

  // Get icon for file type
  const getFileIcon = (type: AttachmentType) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5 text-blue-500" />;
      case 'document':
        return <FileText className="w-5 h-5 text-orange-500" />;
      case 'code':
        return <Code className="w-5 h-5 text-green-500" />;
      case 'data':
        return <Database className="w-5 h-5 text-purple-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
  };

  // Handle file selection
  const handleFiles = useCallback(async (files: FileList | File[]) => {
    setError(null);
    const fileArray = Array.from(files).slice(0, maxFiles);

    if (fileArray.length === 0) return;

    // Validate files
    const validFiles: File[] = [];
    for (const file of fileArray) {
      const validation = fileUploadService.validateFile(file);
      if (!validation.valid) {
        setError(validation.error || 'Invalid file');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Initialize uploading state
    const newUploadingFiles: UploadingFile[] = validFiles.map(file => ({
      id: `upload-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      progress: {
        fileName: file.name,
        loaded: 0,
        total: file.size,
        percentage: 0,
        status: 'pending'
      }
    }));

    setUploadingFiles(prev => [...prev, ...newUploadingFiles]);

    // Process files
    const results: MessageAttachment[] = [];

    for (const uploadingFile of newUploadingFiles) {
      const result = await fileUploadService.uploadFile(
        uploadingFile.file,
        (progress) => {
          setUploadingFiles(prev =>
            prev.map(f =>
              f.id === uploadingFile.id ? { ...f, progress } : f
            )
          );
        }
      );

      if (result.success && result.attachment) {
        results.push(result.attachment);
      } else if (result.error) {
        setError(result.error);
      }

      // Remove from uploading list after completion
      setTimeout(() => {
        setUploadingFiles(prev => prev.filter(f => f.id !== uploadingFile.id));
      }, 1000);
    }

    if (results.length > 0) {
      onFilesUploaded(results);
    }
  }, [maxFiles, onFilesUploaded]);

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

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, [disabled, handleFiles]);

  // Click to select files
  const handleClick = useCallback(() => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  }, [disabled]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [handleFiles]);

  // Cancel upload
  const cancelUpload = useCallback((id: string) => {
    setUploadingFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  return (
    <div className={className}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={fileUploadService.getSupportedExtensions()}
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Drop zone */}
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
          transition-all duration-200 ease-in-out
          ${isDragging
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <div className="flex flex-col items-center gap-3">
          <div className={`
            p-3 rounded-full
            ${isDragging ? 'bg-blue-100' : 'bg-gray-100'}
          `}>
            <Upload className={`w-6 h-6 ${isDragging ? 'text-blue-600' : 'text-gray-500'}`} />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">
              {isDragging ? 'Drop files here' : 'Drag & drop files or click to browse'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Supports images, documents, code files, and data files (max 100MB)
            </p>
          </div>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Uploading files list */}
      {uploadingFiles.length > 0 && (
        <div className="mt-3 space-y-2">
          {uploadingFiles.map(uploadingFile => {
            const mimeType = uploadingFile.file.type || getMimeType(uploadingFile.file.name);
            const attachmentType = getAttachmentType(mimeType);

            return (
              <div
                key={uploadingFile.id}
                className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
              >
                {/* File icon */}
                {getFileIcon(attachmentType)}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">
                    {uploadingFile.file.name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          uploadingFile.progress.status === 'error'
                            ? 'bg-red-500'
                            : uploadingFile.progress.status === 'completed'
                            ? 'bg-green-500'
                            : 'bg-blue-500'
                        }`}
                        style={{ width: `${uploadingFile.progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 flex-shrink-0">
                      {uploadingFile.progress.percentage}%
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formatFileSize(uploadingFile.progress.loaded)} / {formatFileSize(uploadingFile.progress.total)}
                  </p>
                </div>

                {/* Status icon or cancel button */}
                {uploadingFile.progress.status === 'completed' ? (
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                ) : uploadingFile.progress.status === 'error' ? (
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                ) : (
                  <button
                    onClick={() => cancelUpload(uploadingFile.id)}
                    className="p-1 text-gray-400 hover:text-gray-600 flex-shrink-0"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FileUpload;
