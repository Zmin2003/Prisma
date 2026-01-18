
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Search, Sparkles, Zap, Globe, Code, Eye, Brain, Filter, ExternalLink } from 'lucide-react';
import { ApiProvider } from '../types';
import {
  modelSearchService,
  ModelInfo,
  ModelSearchResult,
  ModelCategory,
  ExternalSearchConfig
} from '../services/modelSearchService';

interface ModelSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectModel: (model: ModelInfo) => void;
  externalSearchConfig?: ExternalSearchConfig;
}

type SearchSource = 'builtin' | 'api' | 'hybrid';

const ModelSearchModal: React.FC<ModelSearchModalProps> = ({
  isOpen,
  onClose,
  onSelectModel,
  externalSearchConfig
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSource, setSearchSource] = useState<SearchSource>('builtin');
  const [selectedProvider, setSelectedProvider] = useState<ApiProvider | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<ModelCategory>('all');
  const [searchResults, setSearchResults] = useState<ModelSearchResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // Get available providers and categories
  const providers = useMemo(() => modelSearchService.getProviders(), []);
  const categories: ModelCategory[] = ['all', 'chat', 'code', 'vision', 'reasoning'];

  // Provider display names and colors
  const providerConfig: Record<ApiProvider | 'all', { name: string; color: string }> = {
    all: { name: 'All Providers', color: 'bg-gray-100 text-gray-700' },
    google: { name: 'Google', color: 'bg-blue-100 text-blue-700' },
    openai: { name: 'OpenAI', color: 'bg-green-100 text-green-700' },
    anthropic: { name: 'Anthropic', color: 'bg-orange-100 text-orange-700' },
    deepseek: { name: 'DeepSeek', color: 'bg-purple-100 text-purple-700' },
    xai: { name: 'xAI', color: 'bg-gray-100 text-gray-700' },
    mistral: { name: 'Mistral', color: 'bg-red-100 text-red-700' },
    custom: { name: 'Custom', color: 'bg-yellow-100 text-yellow-700' }
  };

  // Category icons
  const categoryIcons: Record<ModelCategory, React.ReactNode> = {
    all: <Globe className="w-4 h-4" />,
    chat: <Sparkles className="w-4 h-4" />,
    code: <Code className="w-4 h-4" />,
    vision: <Eye className="w-4 h-4" />,
    reasoning: <Brain className="w-4 h-4" />
  };

  // Perform search
  const performSearch = useCallback(async () => {
    setIsSearching(true);

    try {
      let result: ModelSearchResult;

      const options = {
        provider: selectedProvider === 'all' ? undefined : selectedProvider,
        category: selectedCategory,
        limit: 20
      };

      if (searchSource === 'api' && externalSearchConfig?.apiKey) {
        result = await modelSearchService.searchExternal(searchQuery, externalSearchConfig);
      } else if (searchSource === 'hybrid' && externalSearchConfig?.apiKey) {
        result = await modelSearchService.searchHybrid(searchQuery, {
          ...options,
          externalConfig: externalSearchConfig
        });
      } else {
        result = modelSearchService.search(searchQuery, options);
      }

      setSearchResults(result);
    } catch (error) {
      console.error('Search failed:', error);
      setSearchResults({ models: [], source: 'builtin', totalCount: 0 });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchSource, selectedProvider, selectedCategory, externalSearchConfig]);

  // Initial load and search on filter change
  useEffect(() => {
    if (isOpen) {
      performSearch();
    }
  }, [isOpen, selectedProvider, selectedCategory, searchSource, performSearch]);

  // Debounced search on query change
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, isOpen, performSearch]);

  // Handle model selection
  const handleSelectModel = (model: ModelInfo) => {
    onSelectModel(model);
    onClose();
  };

  // Handle keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Search Models</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-100">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search models by name, provider, or capability..."
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {/* Search Source Selector */}
          <div className="flex items-center gap-2 mt-3">
            <span className="text-sm text-gray-500">Source:</span>
            <div className="flex gap-1">
              <button
                onClick={() => setSearchSource('builtin')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                  searchSource === 'builtin'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Built-in
              </button>
              {externalSearchConfig?.apiKey && (
                <>
                  <button
                    onClick={() => setSearchSource('api')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      searchSource === 'api'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    API Search
                  </button>
                  <button
                    onClick={() => setSearchSource('hybrid')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                      searchSource === 'hybrid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Hybrid
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                showFilters ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Filter className="w-3 h-3" />
              Filters
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-xl space-y-3">
              {/* Provider Filter */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Provider</label>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setSelectedProvider('all')}
                    className={`px-2 py-1 text-xs rounded-md transition-colors ${
                      selectedProvider === 'all'
                        ? 'bg-gray-800 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {providers.map(provider => (
                    <button
                      key={provider}
                      onClick={() => setSelectedProvider(provider)}
                      className={`px-2 py-1 text-xs rounded-md transition-colors ${
                        selectedProvider === provider
                          ? providerConfig[provider].color
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {providerConfig[provider].name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter */}
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1.5 block">Capability</label>
                <div className="flex flex-wrap gap-1">
                  {categories.map(category => (
                    <button
                      key={category}
                      onClick={() => setSelectedCategory(category)}
                      className={`flex items-center gap-1 px-2 py-1 text-xs rounded-md transition-colors ${
                        selectedCategory === category
                          ? 'bg-gray-800 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {categoryIcons[category]}
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSearching ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          ) : searchResults && searchResults.models.length > 0 ? (
            <div className="space-y-2">
              {/* Results count */}
              <p className="text-xs text-gray-500 mb-3">
                Found {searchResults.totalCount} models
                {searchResults.source !== 'builtin' && (
                  <span className="ml-1">
                    (source: {searchResults.source})
                  </span>
                )}
              </p>

              {/* Model list */}
              {searchResults.models.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleSelectModel(model)}
                  className="w-full p-4 bg-gray-50 hover:bg-gray-100 rounded-xl text-left transition-colors group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          {model.name}
                        </h3>
                        {model.isNew && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-green-100 text-green-700 rounded">
                            NEW
                          </span>
                        )}
                        {model.isFeatured && (
                          <Zap className="w-3.5 h-3.5 text-yellow-500" />
                        )}
                      </div>

                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {model.description || 'No description available'}
                      </p>

                      <div className="flex items-center gap-2 mt-2">
                        <span className={`px-2 py-0.5 text-xs font-medium rounded ${providerConfig[model.provider].color}`}>
                          {providerConfig[model.provider].name}
                        </span>

                        {model.capabilities && model.capabilities.length > 0 && (
                          <div className="flex items-center gap-1">
                            {model.capabilities.slice(0, 3).map(cap => (
                              <span
                                key={cap}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] bg-gray-200 text-gray-600 rounded"
                              >
                                {categoryIcons[cap as ModelCategory] || null}
                                {cap}
                              </span>
                            ))}
                          </div>
                        )}

                        {model.contextWindow && (
                          <span className="text-[10px] text-gray-400">
                            {(model.contextWindow / 1000).toFixed(0)}K ctx
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ExternalLink className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-12 h-12 text-gray-300 mb-3" />
              <p className="text-gray-500">No models found</p>
              <p className="text-sm text-gray-400 mt-1">
                Try adjusting your search or filters
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Select a model to add it to your custom models
          </p>
        </div>
      </div>
    </div>
  );
};

export default ModelSearchModal;
