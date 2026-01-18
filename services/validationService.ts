
import { ApiProvider, CustomModel, AppConfig, ModelOption } from '../types';
import { logger } from './logger';
import { MODELS } from '../config';

// ============================================================================
// Types
// ============================================================================

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  suggestedAction: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

// ============================================================================
// Error Codes
// ============================================================================

export const ValidationErrorCodes = {
  MODEL_NOT_FOUND: 'MODEL_NOT_FOUND',
  API_KEY_REQUIRED: 'API_KEY_REQUIRED',
  API_KEY_FORMAT_INVALID: 'API_KEY_FORMAT_INVALID',
  API_KEY_EMPTY: 'API_KEY_EMPTY',
  BASE_URL_REQUIRED: 'BASE_URL_REQUIRED',
  BASE_URL_INVALID: 'BASE_URL_INVALID',
  BASE_URL_PROTOCOL_INVALID: 'BASE_URL_PROTOCOL_INVALID',
  BASE_URL_INSECURE: 'BASE_URL_INSECURE',
  BASE_URL_PATH_MISSING: 'BASE_URL_PATH_MISSING',
} as const;

// ============================================================================
// API Key Patterns
// ============================================================================

const API_KEY_PATTERNS: Record<ApiProvider, RegExp | null> = {
  google: /^AIza[A-Za-z0-9_-]{35}$/,
  openai: /^sk-[A-Za-z0-9]{32,}$/,
  anthropic: /^sk-ant-[A-Za-z0-9-]+$/,
  deepseek: /^sk-[A-Za-z0-9]+$/,
  xai: /^xai-[A-Za-z0-9]+$/,
  mistral: /^[A-Za-z0-9]{32,}$/,
  custom: null  // No specific pattern for custom providers
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Validate if a model exists in preset or custom models
 */
export function validateModelExists(
  modelName: string,
  customModels?: CustomModel[]
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check preset models first
  const isPreset = MODELS.some(m => m.value === modelName);
  if (isPreset) {
    return { isValid: true, errors, warnings };
  }

  // Check custom models
  const customModel = customModels?.find(m => m.name === modelName);
  if (!customModel) {
    errors.push({
      code: ValidationErrorCodes.MODEL_NOT_FOUND,
      field: 'model',
      message: `Model "${modelName}" is not configured`,
      suggestedAction: 'Add this model in Settings > Custom Models'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate API key format for a given provider
 */
export function validateApiKeyFormat(
  apiKey: string | undefined,
  provider: ApiProvider
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Check presence
  if (!apiKey || apiKey.trim() === '') {
    if (provider === 'custom') {
      // Warning only for custom - some providers don't need keys
      warnings.push({
        code: ValidationErrorCodes.API_KEY_EMPTY,
        message: 'No API key configured. Some providers require authentication.'
      });
    } else {
      errors.push({
        code: ValidationErrorCodes.API_KEY_REQUIRED,
        field: 'apiKey',
        message: `API key is required for ${provider} provider`,
        suggestedAction: 'Add your API key in Settings > Custom Models'
      });
    }
    return { isValid: errors.length === 0, errors, warnings };
  }

  // Check format if pattern exists
  const pattern = API_KEY_PATTERNS[provider];
  if (pattern && !pattern.test(apiKey.trim())) {
    warnings.push({
      code: ValidationErrorCodes.API_KEY_FORMAT_INVALID,
      message: `API key format may not match expected pattern for ${provider}. Proceeding anyway.`
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate base URL format
 */
export function validateBaseUrlFormat(
  baseUrl: string | undefined,
  provider: ApiProvider
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Custom provider requires baseUrl
  if (provider === 'custom') {
    if (!baseUrl || baseUrl.trim() === '') {
      errors.push({
        code: ValidationErrorCodes.BASE_URL_REQUIRED,
        field: 'baseUrl',
        message: 'Base URL is required for custom providers',
        suggestedAction: 'Add the API endpoint URL in Settings > Custom Models'
      });
      return { isValid: false, errors, warnings };
    }
  }

  if (baseUrl && baseUrl.trim() !== '') {
    try {
      const url = new URL(baseUrl.trim());

      // Protocol check
      if (!['http:', 'https:'].includes(url.protocol)) {
        errors.push({
          code: ValidationErrorCodes.BASE_URL_PROTOCOL_INVALID,
          field: 'baseUrl',
          message: 'Base URL must use HTTP or HTTPS protocol',
          suggestedAction: 'Update URL to start with https://'
        });
      }

      // HTTPS warning for production
      if (url.protocol === 'http:' && !url.hostname.includes('localhost') && !url.hostname.includes('127.0.0.1')) {
        warnings.push({
          code: ValidationErrorCodes.BASE_URL_INSECURE,
          message: 'Using HTTP for non-localhost URL is not recommended'
        });
      }

      // Path check - only warn, don't error
      if (!url.pathname.endsWith('/v1') && !url.pathname.endsWith('/v1/') && url.pathname === '/') {
        warnings.push({
          code: ValidationErrorCodes.BASE_URL_PATH_MISSING,
          message: 'Base URL typically ends with /v1 for OpenAI-compatible APIs'
        });
      }
    } catch (e) {
      errors.push({
        code: ValidationErrorCodes.BASE_URL_INVALID,
        field: 'baseUrl',
        message: 'Invalid URL format',
        suggestedAction: 'Enter a valid URL (e.g., https://api.example.com/v1)'
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a complete custom model configuration
 */
export function validateCustomModelConfig(model: CustomModel): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // API Key validation
  const apiKeyResult = validateApiKeyFormat(model.apiKey, model.provider);
  allErrors.push(...apiKeyResult.errors);
  allWarnings.push(...apiKeyResult.warnings);

  // BaseURL validation
  const baseUrlResult = validateBaseUrlFormat(model.baseUrl, model.provider);
  allErrors.push(...baseUrlResult.errors);
  allWarnings.push(...baseUrlResult.warnings);

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings
  };
}

/**
 * Validate full configuration before API call
 * This is the main entry point for pre-execution validation
 */
export function validateFullConfig(
  model: ModelOption,
  config: AppConfig
): ValidationResult {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  logger.debug('Validation', 'Starting full config validation', { model });

  // Step 1: Check if model exists
  const modelResult = validateModelExists(model, config.customModels);
  allErrors.push(...modelResult.errors);
  allWarnings.push(...modelResult.warnings);

  // If model not found, return early
  if (!modelResult.isValid) {
    logger.warn('Validation', 'Model not found', { model, errors: modelResult.errors });
    return {
      isValid: false,
      errors: allErrors,
      warnings: allWarnings
    };
  }

  // Step 2: If it's a custom model, validate its configuration
  const customModel = config.customModels?.find(m => m.name === model);
  if (customModel) {
    const customResult = validateCustomModelConfig(customModel);
    allErrors.push(...customResult.errors);
    allWarnings.push(...customResult.warnings);

    if (!customResult.isValid) {
      logger.warn('Validation', 'Custom model config invalid', {
        model,
        errors: customResult.errors
      });
    }
  }

  // Step 3: Check global custom API settings if enabled
  if (config.enableCustomApi && !customModel) {
    // Validate global custom API key
    if (config.customApiKey) {
      const apiKeyResult = validateApiKeyFormat(config.customApiKey, config.apiProvider || 'custom');
      allWarnings.push(...apiKeyResult.warnings);
      // Don't add errors for global config - it's optional
    }

    // Validate global custom base URL
    if (config.customBaseUrl) {
      const baseUrlResult = validateBaseUrlFormat(config.customBaseUrl, config.apiProvider || 'custom');
      allWarnings.push(...baseUrlResult.warnings);
      // Don't add errors for global config - it's optional
    }
  }

  const isValid = allErrors.length === 0;

  if (isValid) {
    logger.debug('Validation', 'Config validation passed', {
      model,
      warningCount: allWarnings.length
    });
  } else {
    logger.error('Validation', 'Config validation failed', {
      model,
      errors: allErrors
    });
  }

  return {
    isValid,
    errors: allErrors,
    warnings: allWarnings
  };
}

// ============================================================================
// UI Severity Mapping
// ============================================================================

/**
 * Map validation errors to UI severity for display
 */
export function mapToUISeverity(error: ValidationError): 'toast' | 'card' {
  const cardErrors = [
    ValidationErrorCodes.MODEL_NOT_FOUND,
    ValidationErrorCodes.API_KEY_REQUIRED,
    ValidationErrorCodes.BASE_URL_REQUIRED
  ];
  return cardErrors.includes(error.code as any) ? 'card' : 'toast';
}

// ============================================================================
// Validation Service Class (for advanced use cases)
// ============================================================================

class ValidationService {
  validateCustomModelConfig = validateCustomModelConfig;
  validateApiKey = validateApiKeyFormat;
  validateBaseUrl = validateBaseUrlFormat;
  validateFullConfig = validateFullConfig;
  validateModelExists = validateModelExists;
  mapToUISeverity = mapToUISeverity;

  /**
   * Test connectivity to a custom model endpoint
   * This is an optional async validation step
   */
  async testConnectivity(model: CustomModel): Promise<ValidationResult> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    // First validate the config
    const configResult = this.validateCustomModelConfig(model);
    if (!configResult.isValid) {
      return configResult;
    }

    // TODO: Implement actual connectivity test
    // This would make a lightweight API call to verify the endpoint works
    logger.debug('Validation', 'Connectivity test skipped (not implemented)', { model: model.name });

    return {
      isValid: true,
      errors,
      warnings
    };
  }
}

export const validationService = new ValidationService();
