
import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Bot, Key, Globe, ChevronDown, ChevronUp, Loader2, AlertCircle, Server } from 'lucide-react';
import { AppConfig, ApiProvider } from '../../types';
import { adminListModels, adminCreateModel, adminDeleteModel, adminUpdateModel, RegistryModel } from '../../api';

interface ModelSectionProps {
  config: AppConfig;
  setConfig: (c: AppConfig) => void;
}

const PROVIDERS: { value: ApiProvider | 'custom'; label: string }[] = [
  { value: 'custom', label: 'Custom (OpenAI-compatible)' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'deepseek', label: 'DeepSeek' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'xai', label: 'xAI' },
  { value: 'mistral', label: 'Mistral' },
  { value: 'google', label: 'Google' },
];

const CREDENTIAL_REFS: { value: string; label: string }[] = [
  { value: '', label: 'None (use server default)' },
  { value: 'OPENAI_API_KEY', label: 'OpenAI API Key' },
  { value: 'ANTHROPIC_API_KEY', label: 'Anthropic API Key' },
  { value: 'GOOGLE_API_KEY', label: 'Google API Key' },
  { value: 'DEEPSEEK_API_KEY', label: 'DeepSeek API Key' },
  { value: 'XAI_API_KEY', label: 'xAI API Key' },
  { value: 'MISTRAL_API_KEY', label: 'Mistral API Key' },
];

const ModelSection = ({ config, setConfig }: ModelSectionProps) => {
  const [adminKey, setAdminKey] = useState(() => sessionStorage.getItem('admin-key') || '');
  const [models, setModels] = useState<RegistryModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  const [newModelId, setNewModelId] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newModelProvider, setNewModelProvider] = useState<string>('custom');
  const [newUpstreamModel, setNewUpstreamModel] = useState('');
  const [newCredentialRef, setNewCredentialRef] = useState('');
  const [newModelBaseUrl, setNewModelBaseUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadModels = async () => {
    if (!adminKey) return;
    setLoading(true);
    setError(null);
    try {
      const list = await adminListModels(adminKey, { backendUrl: config.backendUrl });
      setModels(list);
      sessionStorage.setItem('admin-key', adminKey);
    } catch (e: any) {
      setError(e.message || 'Failed to load models');
      setModels([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (adminKey) {
      loadModels();
    }
  }, [adminKey]);

  const handleAddModel = async () => {
    if (!newModelId.trim() || !newDisplayName.trim() || !newUpstreamModel.trim()) {
      setError('Model ID, Display Name, and Upstream Model are required');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await adminCreateModel(adminKey, {
        id: newModelId.trim(),
        display_name: newDisplayName.trim(),
        provider: newModelProvider,
        upstream_model: newUpstreamModel.trim(),
        base_url: newModelBaseUrl.trim() || undefined,
        credential_ref: newCredentialRef || undefined,
        enabled: true,
      }, { backendUrl: config.backendUrl });
      await loadModels();
      setNewModelId('');
      setNewDisplayName('');
      setNewUpstreamModel('');
      setNewCredentialRef('');
      setNewModelBaseUrl('');
    } catch (e: any) {
      setError(e.message || 'Failed to create model');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteModel = async (modelId: string) => {
    if (!confirm(`Delete model "${modelId}"?`)) return;
    try {
      await adminDeleteModel(adminKey, modelId, { backendUrl: config.backendUrl });
      await loadModels();
      if (expandedModelId === modelId) {
        setExpandedModelId(null);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to delete model');
    }
  };

  const handleToggleEnabled = async (model: RegistryModel) => {
    try {
      await adminUpdateModel(adminKey, model.id, { enabled: !model.enabled }, { backendUrl: config.backendUrl });
      await loadModels();
    } catch (e: any) {
      setError(e.message || 'Failed to update model');
    }
  };

  if (!adminKey) {
    return (
      <div className="space-y-4 pt-1">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model Registry</h3>
        <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
          <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg border border-amber-100">
            <Server size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700">
              Models are managed server-side. Enter your Admin API Key to manage models.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
              <Key size={14} className="text-slate-400" />
              Admin API Key
            </label>
            <input
              type="password"
              placeholder="Enter ADMIN_API_KEY..."
              value={adminKey}
              onChange={(e) => setAdminKey(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pt-1">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Model Registry</h3>
        <button
          onClick={() => { setAdminKey(''); sessionStorage.removeItem('admin-key'); }}
          className="text-xs text-slate-400 hover:text-slate-600"
        >
          Logout
        </button>
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 rounded-lg border border-red-100">
          <AlertCircle size={14} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
        </div>
      )}

      <div className="p-4 bg-slate-50 rounded-lg border border-slate-100 space-y-4">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Model ID</label>
              <input
                type="text"
                placeholder="e.g., dt-gpt-4o-mini"
                value={newModelId}
                onChange={(e) => setNewModelId(e.target.value.replace(/[^a-zA-Z0-9._:-]/g, ''))}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Display Name</label>
              <input
                type="text"
                placeholder="e.g., GPT-4o Mini"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Provider</label>
              <select
                value={newModelProvider}
                onChange={(e) => setNewModelProvider(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
              >
                {PROVIDERS.map(p => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Bot size={14} className="text-slate-400" />
                Upstream Model
              </label>
              <input
                type="text"
                placeholder="e.g., gpt-4o-mini"
                value={newUpstreamModel}
                onChange={(e) => setNewUpstreamModel(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Key size={14} className="text-slate-400" />
                Credential
              </label>
              <select
                value={newCredentialRef}
                onChange={(e) => setNewCredentialRef(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none"
              >
                {CREDENTIAL_REFS.map(c => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Globe size={14} className="text-slate-400" />
                Base URL (optional)
              </label>
              <input
                type="text"
                placeholder="https://api.openai.com/v1"
                value={newModelBaseUrl}
                onChange={(e) => setNewModelBaseUrl(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            onClick={handleAddModel}
            disabled={!newModelId.trim() || !newDisplayName.trim() || !newUpstreamModel.trim() || submitting}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-all shadow-sm"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Add Model
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 size={24} className="animate-spin text-slate-400" />
          </div>
        ) : models.length > 0 ? (
          <div className="border-t border-slate-200 pt-4">
            <div className="text-xs font-medium text-slate-500 mb-3">
              Registered Models ({models.length})
            </div>
            <div className="space-y-2">
              {models.map((model) => (
                <div
                  key={model.id}
                  className={`bg-white rounded-lg border transition-colors ${
                    model.enabled ? 'border-slate-200 hover:border-slate-300' : 'border-slate-100 bg-slate-50 opacity-60'
                  }`}
                >
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer"
                    onClick={() => setExpandedModelId(expandedModelId === model.id ? null : model.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">
                        {model.display_name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {model.id} • {model.provider} • {model.upstream_model}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleEnabled(model);
                        }}
                        className={`px-2 py-1 text-xs rounded ${
                          model.enabled
                            ? 'bg-green-100 text-green-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {model.enabled ? 'Enabled' : 'Disabled'}
                      </button>
                      {expandedModelId === model.id ? (
                        <ChevronUp size={16} className="text-slate-400" />
                      ) : (
                        <ChevronDown size={16} className="text-slate-400" />
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteModel(model.id);
                        }}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove model"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {expandedModelId === model.id && (
                    <div className="px-3 pb-3 pt-0 space-y-2 text-xs text-slate-600 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div><strong>Base URL:</strong> {model.base_url || '(default)'}</div>
                      <div><strong>Credential:</strong> {model.credential_ref || '(server default)'}</div>
                      <div><strong>Created:</strong> {new Date(model.created_at).toLocaleString()}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-sm text-slate-500 text-center py-4">
            No models registered yet
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSection;
