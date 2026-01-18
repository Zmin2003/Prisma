import React, { useState } from 'react';
import { X, ChevronRight, ChevronLeft, Sparkles, Key, CheckCircle, Loader2, XCircle, ExternalLink } from 'lucide-react';
import { AppConfig, ApiProvider } from '../types';
import { validateApiKey, validateBaseUrl } from '../config';
import { testApiConnection } from '../api';

interface ConfigWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (config: AppConfig) => void;
  initialConfig: AppConfig;
}

type WizardStep = 'welcome' | 'api-config' | 'test-connection';

const ConfigWizard = ({ isOpen, onClose, onComplete, initialConfig }: ConfigWizardProps) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('welcome');
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [apiProvider, setApiProvider] = useState<ApiProvider>('google');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [apiKeyError, setApiKeyError] = useState('');
  const [baseUrlError, setBaseUrlError] = useState('');
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep === 'welcome') {
      setCurrentStep('api-config');
    } else if (currentStep === 'api-config') {
      // Validate before moving to test
      const keyValidation = validateApiKey(apiKey, apiProvider);
      if (!keyValidation.isValid) {
        setApiKeyError(keyValidation.error || 'Invalid API Key');
        return;
      }

      if (baseUrl) {
        const urlValidation = validateBaseUrl(baseUrl);
        if (!urlValidation.isValid) {
          setBaseUrlError(urlValidation.error || 'Invalid Base URL');
          return;
        }
      }

      setApiKeyError('');
      setBaseUrlError('');
      setCurrentStep('test-connection');
      // Auto-test connection when entering test step
      setTimeout(() => handleTestConnection(), 300);
    }
  };

  const handleBack = () => {
    if (currentStep === 'test-connection') {
      setCurrentStep('api-config');
      setTestStatus('idle');
    } else if (currentStep === 'api-config') {
      setCurrentStep('welcome');
    }
  };

  const handleTestConnection = async () => {
    setTestStatus('testing');
    setTestMessage('');

    const result = await testApiConnection(apiProvider, apiKey, baseUrl || undefined);

    if (result.success) {
      setTestStatus('success');
      setTestMessage(result.message || 'Connection successful');
    } else {
      setTestStatus('error');
      setTestMessage(result.error || 'Connection failed');
    }
  };

  const handleComplete = () => {
    const updatedConfig: AppConfig = {
      ...config,
      customApiKey: apiKey,
      customBaseUrl: baseUrl,
      enableCustomApi: true,
      apiProvider: apiProvider
    };
    onComplete(updatedConfig);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  const getStepNumber = (step: WizardStep): number => {
    const steps: WizardStep[] = ['welcome', 'api-config', 'test-connection'];
    return steps.indexOf(step) + 1;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header with Step Indicator */}
        <div className="relative bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-white">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors rounded-full p-1 hover:bg-white/10"
          >
            <X size={20} />
          </button>

          <div className="flex items-center gap-3 mb-4">
            <Sparkles size={24} className="text-blue-200" />
            <h2 className="text-2xl font-bold">Welcome to Prisma</h2>
          </div>

          {/* Step Indicator */}
          <div className="flex items-center gap-2 mt-6">
            {(['welcome', 'api-config', 'test-connection'] as WizardStep[]).map((step, index) => (
              <React.Fragment key={step}>
                <div className={`flex items-center gap-2 ${
                  getStepNumber(currentStep) > index + 1
                    ? 'text-blue-200'
                    : getStepNumber(currentStep) === index + 1
                    ? 'text-white'
                    : 'text-white/40'
                }`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    getStepNumber(currentStep) > index + 1
                      ? 'bg-blue-200 text-blue-700'
                      : getStepNumber(currentStep) === index + 1
                      ? 'bg-white text-blue-600'
                      : 'bg-white/20'
                  }`}>
                    {getStepNumber(currentStep) > index + 1 ? <CheckCircle size={16} /> : index + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:inline">
                    {step === 'welcome' ? 'Welcome' : step === 'api-config' ? 'API Setup' : 'Test'}
                  </span>
                </div>
                {index < 2 && (
                  <div className={`flex-1 h-0.5 ${
                    getStepNumber(currentStep) > index + 1 ? 'bg-blue-200' : 'bg-white/20'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="p-8 min-h-[400px]">
          {currentStep === 'welcome' && <WelcomeStep />}
          {currentStep === 'api-config' && (
            <ApiConfigStep
              apiProvider={apiProvider}
              setApiProvider={setApiProvider}
              apiKey={apiKey}
              setApiKey={setApiKey}
              baseUrl={baseUrl}
              setBaseUrl={setBaseUrl}
              apiKeyError={apiKeyError}
              setApiKeyError={setApiKeyError}
              baseUrlError={baseUrlError}
              setBaseUrlError={setBaseUrlError}
            />
          )}
          {currentStep === 'test-connection' && (
            <TestConnectionStep
              testStatus={testStatus}
              testMessage={testMessage}
              onRetry={handleTestConnection}
            />
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors font-medium"
          >
            Skip for now
          </button>

          <div className="flex items-center gap-3">
            {currentStep !== 'welcome' && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg transition-all flex items-center gap-2 font-medium"
              >
                <ChevronLeft size={16} />
                Back
              </button>
            )}

            {currentStep === 'test-connection' && testStatus === 'success' ? (
              <button
                onClick={handleComplete}
                className="px-6 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 font-medium"
              >
                <CheckCircle size={16} />
                Complete Setup
              </button>
            ) : currentStep !== 'test-connection' ? (
              <button
                onClick={handleNext}
                disabled={currentStep === 'api-config' && !apiKey.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 font-medium"
              >
                Next
                <ChevronRight size={16} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};

// Step Components
interface ApiConfigStepProps {
  apiProvider: ApiProvider;
  setApiProvider: (provider: ApiProvider) => void;
  apiKey: string;
  setApiKey: (key: string) => void;
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  apiKeyError: string;
  setApiKeyError: (error: string) => void;
  baseUrlError: string;
  setBaseUrlError: (error: string) => void;
}

const ApiConfigStep = ({
  apiProvider,
  setApiProvider,
  apiKey,
  setApiKey,
  baseUrl,
  setBaseUrl,
  apiKeyError,
  setApiKeyError,
  baseUrlError,
  setBaseUrlError
}: ApiConfigStepProps) => {
  const providers: { value: ApiProvider; label: string; keyPrefix: string; docsUrl: string }[] = [
    { value: 'google', label: 'Google Gemini', keyPrefix: 'AIza...', docsUrl: 'https://ai.google.dev/gemini-api/docs/api-key' },
    { value: 'openai', label: 'OpenAI', keyPrefix: 'sk-...', docsUrl: 'https://platform.openai.com/api-keys' },
    { value: 'anthropic', label: 'Anthropic Claude', keyPrefix: 'sk-ant-...', docsUrl: 'https://console.anthropic.com/settings/keys' },
    { value: 'deepseek', label: 'DeepSeek', keyPrefix: 'sk-...', docsUrl: 'https://platform.deepseek.com/api_keys' },
    { value: 'xai', label: 'xAI Grok', keyPrefix: 'xai-...', docsUrl: 'https://console.x.ai/' },
    { value: 'mistral', label: 'Mistral AI', keyPrefix: 'api-key', docsUrl: 'https://console.mistral.ai/api-keys/' },
    { value: 'custom', label: 'Custom API', keyPrefix: 'custom', docsUrl: '' }
  ];

  const selectedProvider = providers.find(p => p.value === apiProvider) || providers[0];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="text-center space-y-2">
        <h3 className="text-2xl font-bold text-slate-800">Configure API Connection</h3>
        <p className="text-slate-600">
          Choose your AI provider and enter your API credentials
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700">
            Select AI Provider
          </label>
          <select
            value={apiProvider}
            onChange={(e) => {
              setApiProvider(e.target.value as ApiProvider);
              setApiKeyError('');
              setBaseUrlError('');
            }}
            className="w-full bg-white border border-slate-300 text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 outline-none"
          >
            {providers.map(provider => (
              <option key={provider.value} value={provider.value}>
                {provider.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <Key size={14} className="text-slate-500" />
            API Key
          </label>
          <input
            type="password"
            placeholder={selectedProvider.keyPrefix}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setApiKeyError('');
            }}
            className={`w-full bg-white border text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 outline-none placeholder:text-slate-400 ${
              apiKeyError ? 'border-red-300' : 'border-slate-300'
            }`}
          />
          {apiKeyError && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
              <XCircle size={14} className="mt-0.5 flex-shrink-0" />
              <span>{apiKeyError}</span>
            </div>
          )}
          {selectedProvider.docsUrl && (
            <a
              href={selectedProvider.docsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
            >
              <ExternalLink size={12} />
              Get your {selectedProvider.label} API key
            </a>
          )}
        </div>

        {(apiProvider === 'custom' || baseUrl) && (
          <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <label className="text-sm font-semibold text-slate-700">
              Base URL (Optional)
            </label>
            <input
              type="text"
              placeholder="https://api.example.com/v1"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setBaseUrlError('');
              }}
              className={`w-full bg-white border text-slate-800 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 p-3 outline-none placeholder:text-slate-400 ${
                baseUrlError ? 'border-red-300' : 'border-slate-300'
              }`}
            />
            {baseUrlError && (
              <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-2 rounded-lg">
                <XCircle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{baseUrlError}</span>
              </div>
            )}
          </div>
        )}

        <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> Your API key is stored locally in your browser and never sent to our servers.
            It's only used to communicate directly with your chosen AI provider.
          </p>
        </div>
      </div>
    </div>
  );
};

interface TestConnectionStepProps {
  testStatus: 'idle' | 'testing' | 'success' | 'error';
  testMessage: string;
  onRetry: () => void;
}

const TestConnectionStep = ({ testStatus, testMessage, onRetry }: TestConnectionStepProps) => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="text-center space-y-2">
      <h3 className="text-2xl font-bold text-slate-800">Test Connection</h3>
      <p className="text-slate-600">
        Verifying your API configuration
      </p>
    </div>

    <div className="flex flex-col items-center justify-center py-8">
      {testStatus === 'testing' && (
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <Loader2 size={40} className="text-blue-600 animate-spin" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-800">Testing connection...</p>
            <p className="text-sm text-slate-600 mt-1">This may take a few seconds</p>
          </div>
        </div>
      )}

      {testStatus === 'success' && (
        <div className="text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle size={40} className="text-green-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-green-800">Connection Successful!</p>
            <p className="text-sm text-slate-600 mt-1">{testMessage}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200 max-w-md">
            <p className="text-sm text-green-900">
              Your API is configured correctly and ready to use. Click "Complete Setup" to start using Prisma.
            </p>
          </div>
        </div>
      )}

      {testStatus === 'error' && (
        <div className="text-center space-y-4 animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto">
            <XCircle size={40} className="text-red-600" />
          </div>
          <div>
            <p className="text-lg font-semibold text-red-800">Connection Failed</p>
            <p className="text-sm text-slate-600 mt-1">{testMessage}</p>
          </div>
          <div className="p-4 bg-red-50 rounded-lg border border-red-200 max-w-md">
            <p className="text-sm text-red-900 mb-3">
              <strong>Common issues:</strong>
            </p>
            <ul className="text-xs text-red-800 space-y-1 text-left list-disc list-inside">
              <li>Invalid or expired API key</li>
              <li>Incorrect API provider selected</li>
              <li>Network connectivity issues</li>
              <li>API rate limits exceeded</li>
            </ul>
          </div>
          <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-md active:scale-95 flex items-center gap-2 font-medium mx-auto"
          >
            <Loader2 size={16} />
            Retry Connection
          </button>
        </div>
      )}
    </div>
  </div>
);

const WelcomeStep = () => (
  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="text-center space-y-4">
      <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg">
        <Sparkles size={40} className="text-white" />
      </div>
      <h3 className="text-2xl font-bold text-slate-800">
        Visual Deep Multi-Agent Reasoning Engine
      </h3>
      <p className="text-slate-600 max-w-lg mx-auto">
        Prisma uses advanced AI models to break down complex problems into expert perspectives,
        providing deep, thoughtful analysis through collaborative reasoning.
      </p>
    </div>

    <div className="grid gap-4 mt-8">
      <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-xl border border-blue-100">
        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckCircle size={20} className="text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 mb-1">Multi-Agent Architecture</h4>
          <p className="text-sm text-slate-600">
            Manager plans the approach, multiple experts analyze from different angles,
            and synthesis combines insights into a comprehensive answer.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckCircle size={20} className="text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 mb-1">Real-time Visualization</h4>
          <p className="text-sm text-slate-600">
            Watch the thinking process unfold in real-time as each agent contributes
            their expertise to solve your problem.
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4 p-4 bg-purple-50 rounded-xl border border-purple-100">
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <CheckCircle size={20} className="text-white" />
        </div>
        <div>
          <h4 className="font-semibold text-slate-800 mb-1">Flexible Configuration</h4>
          <p className="text-sm text-slate-600">
            Control thinking depth, enable recursive refinement, and customize the reasoning
            process to match your needs.
          </p>
        </div>
      </div>
    </div>

    <div className="mt-6 p-4 bg-amber-50 rounded-xl border border-amber-200">
      <p className="text-sm text-amber-900">
        <strong>Quick Setup:</strong> This wizard will help you configure your API connection
        in just 3 simple steps. You can skip this and configure later in Settings.
      </p>
    </div>
  </div>
);

export default ConfigWizard;
