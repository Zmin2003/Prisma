
import { MessageAttachment, AttachmentType } from '../types';
import { logger } from './logger';

// ============================================================================
// Constants
// ============================================================================

// File size threshold for chunked upload (10MB)
export const CHUNK_THRESHOLD = 10 * 1024 * 1024;

// Chunk size for large files (1MB)
export const CHUNK_SIZE = 1 * 1024 * 1024;

// Maximum file size (100MB)
export const MAX_FILE_SIZE = 100 * 1024 * 1024;

// Supported MIME types by category
export const SUPPORTED_MIME_TYPES: Record<AttachmentType, string[]> = {
  image: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'image/bmp'
  ],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    'text/html',
    'text/csv'
  ],
  code: [
    'text/javascript',
    'application/javascript',
    'text/typescript',
    'application/typescript',
    'text/x-python',
    'text/x-java',
    'text/x-c',
    'text/x-cpp',
    'text/x-csharp',
    'text/x-go',
    'text/x-rust',
    'text/x-ruby',
    'text/x-php',
    'text/x-swift',
    'text/x-kotlin',
    'text/css',
    'text/x-scss',
    'text/x-sass',
    'application/json',
    'application/xml',
    'text/xml',
    'application/x-yaml',
    'text/yaml'
  ],
  data: [
    'application/json',
    'text/csv',
    'application/xml',
    'text/xml',
    'application/x-yaml',
    'text/yaml'
  ],
  other: []
};

// File extension to MIME type mapping
const EXTENSION_MIME_MAP: Record<string, string> = {
  // Images
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.bmp': 'image/bmp',
  // Documents
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.html': 'text/html',
  '.htm': 'text/html',
  // Code
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.ts': 'text/typescript',
  '.tsx': 'text/typescript',
  '.jsx': 'text/javascript',
  '.py': 'text/x-python',
  '.java': 'text/x-java',
  '.c': 'text/x-c',
  '.cpp': 'text/x-cpp',
  '.h': 'text/x-c',
  '.hpp': 'text/x-cpp',
  '.cs': 'text/x-csharp',
  '.go': 'text/x-go',
  '.rs': 'text/x-rust',
  '.rb': 'text/x-ruby',
  '.php': 'text/x-php',
  '.swift': 'text/x-swift',
  '.kt': 'text/x-kotlin',
  '.css': 'text/css',
  '.scss': 'text/x-scss',
  '.sass': 'text/x-sass',
  '.json': 'application/json',
  '.xml': 'application/xml',
  '.yaml': 'application/x-yaml',
  '.yml': 'application/x-yaml',
  // Data
  '.csv': 'text/csv'
};

// ============================================================================
// Types
// ============================================================================

export interface FileUploadResult {
  success: boolean;
  attachment?: MessageAttachment;
  error?: string;
}

export interface FileUploadProgress {
  fileName: string;
  loaded: number;
  total: number;
  percentage: number;
  status: 'pending' | 'reading' | 'processing' | 'completed' | 'error';
}

export type ProgressCallback = (progress: FileUploadProgress) => void;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get MIME type from file extension
 */
export function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
  return EXTENSION_MIME_MAP[ext] || 'application/octet-stream';
}

/**
 * Determine attachment type from MIME type
 */
export function getAttachmentType(mimeType: string): AttachmentType {
  for (const [type, mimes] of Object.entries(SUPPORTED_MIME_TYPES)) {
    if (mimes.includes(mimeType)) {
      return type as AttachmentType;
    }
  }
  return 'other';
}

/**
 * Check if file type is supported
 */
export function isFileTypeSupported(mimeType: string): boolean {
  const allSupported = Object.values(SUPPORTED_MIME_TYPES).flat();
  return allSupported.includes(mimeType) || mimeType === 'application/octet-stream';
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate unique ID for attachment
 */
function generateAttachmentId(): string {
  return `att-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// File Reading Functions
// ============================================================================

/**
 * Read file as Base64 string
 */
export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Read file as text (for code/text files)
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as string);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsText(file);
  });
}

/**
 * Read file as ArrayBuffer (for binary processing)
 */
export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };

    reader.readAsArrayBuffer(file);
  });
}

// ============================================================================
// Small File Processing (Base64 Mode)
// ============================================================================

/**
 * Process small file (< 10MB) using Base64 encoding
 */
export async function processSmallFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<FileUploadResult> {
  const fileName = file.name;
  const fileSize = file.size;

  logger.debug('FileUpload', 'Processing small file', { fileName, fileSize });

  // Update progress: reading
  onProgress?.({
    fileName,
    loaded: 0,
    total: fileSize,
    percentage: 0,
    status: 'reading'
  });

  try {
    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`
      };
    }

    // Get MIME type
    const mimeType = file.type || getMimeType(fileName);
    const attachmentType = getAttachmentType(mimeType);

    // Read file as Base64
    const base64Data = await readFileAsBase64(file);

    // Update progress: processing
    onProgress?.({
      fileName,
      loaded: fileSize / 2,
      total: fileSize,
      percentage: 50,
      status: 'processing'
    });

    // Create attachment object
    const attachment: MessageAttachment = {
      id: generateAttachmentId(),
      type: attachmentType,
      mimeType,
      data: base64Data,
      fileName,
      fileSize,
      isChunked: false
    };

    // Create object URL for preview (images only)
    if (attachmentType === 'image') {
      attachment.url = URL.createObjectURL(file);
    }

    // Update progress: completed
    onProgress?.({
      fileName,
      loaded: fileSize,
      total: fileSize,
      percentage: 100,
      status: 'completed'
    });

    logger.info('FileUpload', 'Small file processed successfully', { fileName, attachmentType });

    return {
      success: true,
      attachment
    };
  } catch (error: any) {
    logger.error('FileUpload', 'Failed to process small file', { fileName, error });

    onProgress?.({
      fileName,
      loaded: 0,
      total: fileSize,
      percentage: 0,
      status: 'error'
    });

    return {
      success: false,
      error: error.message || 'Failed to process file'
    };
  }
}

// ============================================================================
// Large File Processing (Chunked Mode)
// ============================================================================

/**
 * Split file into chunks
 */
export function splitIntoChunks(file: File, chunkSize: number = CHUNK_SIZE): Blob[] {
  const chunks: Blob[] = [];
  let offset = 0;

  while (offset < file.size) {
    const chunk = file.slice(offset, offset + chunkSize);
    chunks.push(chunk);
    offset += chunkSize;
  }

  return chunks;
}

/**
 * Read a single chunk as Base64
 */
async function readChunkAsBase64(chunk: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };

    reader.onerror = () => {
      reject(new Error('Failed to read chunk'));
    };

    reader.readAsDataURL(chunk);
  });
}

/**
 * Process large file (>= 10MB) using chunked encoding
 */
export async function processLargeFile(
  file: File,
  onProgress?: ProgressCallback
): Promise<FileUploadResult> {
  const fileName = file.name;
  const fileSize = file.size;

  logger.debug('FileUpload', 'Processing large file with chunks', { fileName, fileSize });

  // Update progress: reading
  onProgress?.({
    fileName,
    loaded: 0,
    total: fileSize,
    percentage: 0,
    status: 'reading'
  });

  try {
    // Validate file size
    if (fileSize > MAX_FILE_SIZE) {
      return {
        success: false,
        error: `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`
      };
    }

    // Get MIME type
    const mimeType = file.type || getMimeType(fileName);
    const attachmentType = getAttachmentType(mimeType);

    // Split file into chunks
    const chunks = splitIntoChunks(file);
    const chunkCount = chunks.length;

    logger.debug('FileUpload', 'File split into chunks', { fileName, chunkCount });

    // Process chunks and collect Base64 data
    const base64Chunks: string[] = [];
    let processedBytes = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkBase64 = await readChunkAsBase64(chunk);
      base64Chunks.push(chunkBase64);

      processedBytes += chunk.size;
      const percentage = Math.round((processedBytes / fileSize) * 100);

      // Update progress
      onProgress?.({
        fileName,
        loaded: processedBytes,
        total: fileSize,
        percentage,
        status: 'processing'
      });
    }

    // Combine all chunks into single Base64 string
    const combinedBase64 = base64Chunks.join('');

    // Create attachment object
    const attachment: MessageAttachment = {
      id: generateAttachmentId(),
      type: attachmentType,
      mimeType,
      data: combinedBase64,
      fileName,
      fileSize,
      isChunked: true,
      chunkCount
    };

    // Create object URL for preview (images only)
    if (attachmentType === 'image') {
      attachment.url = URL.createObjectURL(file);
    }

    // Update progress: completed
    onProgress?.({
      fileName,
      loaded: fileSize,
      total: fileSize,
      percentage: 100,
      status: 'completed'
    });

    logger.info('FileUpload', 'Large file processed successfully', {
      fileName,
      attachmentType,
      chunkCount
    });

    return {
      success: true,
      attachment
    };
  } catch (error: any) {
    logger.error('FileUpload', 'Failed to process large file', { fileName, error });

    onProgress?.({
      fileName,
      loaded: 0,
      total: fileSize,
      percentage: 0,
      status: 'error'
    });

    return {
      success: false,
      error: error.message || 'Failed to process file'
    };
  }
}

// ============================================================================
// File Upload Service Class
// ============================================================================

class FileUploadService {
  private activeUploads: Map<string, { file: File; progress: FileUploadProgress }> = new Map();

  /**
   * Upload a single file
   */
  async uploadFile(
    file: File,
    onProgress?: ProgressCallback
  ): Promise<FileUploadResult> {
    const fileSize = file.size;

    // Use Base64 mode for small files (< 10MB)
    if (fileSize < CHUNK_THRESHOLD) {
      return processSmallFile(file, onProgress);
    }

    // Use chunked mode for large files (>= 10MB)
    logger.info('FileUpload', 'Large file detected, using chunked mode', {
      fileName: file.name,
      fileSize
    });

    return processLargeFile(file, onProgress);
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: File[],
    onProgress?: (fileName: string, progress: FileUploadProgress) => void
  ): Promise<FileUploadResult[]> {
    const results: FileUploadResult[] = [];

    for (const file of files) {
      const result = await this.uploadFile(file, (progress) => {
        onProgress?.(file.name, progress);
      });
      results.push(result);
    }

    return results;
  }

  /**
   * Validate file before upload
   */
  validateFile(file: File): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return {
        valid: false,
        error: `File size exceeds maximum limit of ${formatFileSize(MAX_FILE_SIZE)}`
      };
    }

    // Check file type
    const mimeType = file.type || getMimeType(file.name);
    if (!isFileTypeSupported(mimeType)) {
      return {
        valid: false,
        error: `File type "${mimeType}" is not supported`
      };
    }

    return { valid: true };
  }

  /**
   * Get supported file extensions for file input accept attribute
   * Returns extensions only for better browser compatibility
   */
  getSupportedExtensions(): string {
    const extensions = Object.keys(EXTENSION_MIME_MAP);
    return extensions.join(',');
  }

  /**
   * Clean up object URLs to prevent memory leaks
   */
  revokeObjectUrl(url: string): void {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  }
}

export const fileUploadService = new FileUploadService();
