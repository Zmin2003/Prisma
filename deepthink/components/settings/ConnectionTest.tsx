import React, { useState } from 'react';
import { Wifi, Loader2, CheckCircle2, XCircle, Shield, Server } from 'lucide-react';
import { AppConfig, ModelOption } from '../../types';
import { healthCheck } from '../../api';

interface ConnectionTestProps {
  config: AppConfig;
  currentModel: ModelOption;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

interface TestResult {
  status: TestStatus;
  message?: string;
  latency?: number;
}

const ConnectionTest = ({ config, currentModel }: ConnectionTestProps) => {
  const [result, setResult] = useState<TestResult>({ status: 'idle' });

  const testConnection = async () => {
    setResult({ status: 'testing' });
    const startTime = Date.now();

    try {
      const healthy = await healthCheck({ backendUrl: config.backendUrl, appApiKey: config.appApiKey });
      const latency = Date.now() - startTime;

      if (healthy) {
        setResult({
          status: 'success',
          message: 'Connected to DeepThink backend',
          latency
        });
      } else {
        setResult({
          status: 'error',
          message: 'Backend health check failed'
        });
      }
    } catch (error) {
      setResult({
        status: 'error',
        message: error instanceof Error ? error.message : 'Connection failed'
      });
    }
  };

  const getStatusIcon = () => {
    switch (result.status) {
      case 'testing':
        return <Loader2 size={16} className="animate-spin text-blue-600" />;
      case 'success':
        return <CheckCircle2 size={16} className="text-emerald-600" />;
      case 'error':
        return <XCircle size={16} className="text-red-500" />;
      default:
        return <Wifi size={16} className="text-slate-400" />;
    }
  };

  const getStatusColor = () => {
    switch (result.status) {
      case 'testing':
        return 'border-blue-200 bg-blue-50';
      case 'success':
        return 'border-emerald-200 bg-emerald-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-slate-200 bg-slate-50';
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Backend Connection</h3>
      </div>

      <div className={`p-4 rounded-lg border transition-colors ${getStatusColor()}`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span className="text-sm font-medium text-slate-700">
              {result.status === 'idle' && 'Test Backend Connection'}
              {result.status === 'testing' && 'Testing...'}
              {result.status === 'success' && 'Backend Connected'}
              {result.status === 'error' && 'Connection Failed'}
            </span>
          </div>
          {result.latency && (
            <span className="text-xs text-slate-500">{result.latency}ms</span>
          )}
        </div>

        {result.message && result.status !== 'idle' && (
          <p className={`text-xs mb-3 ${result.status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}>
            {result.message}
          </p>
        )}

        <div className="text-xs text-slate-500 mb-3">
          <strong>Current model:</strong> {currentModel}
        </div>

        <button
          onClick={testConnection}
          disabled={result.status === 'testing'}
          className={`
            w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-all
            ${result.status === 'testing'
              ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm active:scale-[0.98]'
            }
          `}
        >
          {result.status === 'testing' ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Testing Connection...
            </>
          ) : (
            <>
              <Wifi size={14} />
              Test Connection
            </>
          )}
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100">
        <Server size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <p className="text-xs text-slate-500">
            If your backend is protected with APP_API_KEY, set it in Settings. You can also override upstream provider credentials per request.
          </p>
          <p className="text-xs text-slate-400">
            Models from the Model Registry use server-side configuration unless you enable the upstream override.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ConnectionTest;
