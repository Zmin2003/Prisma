
import React, { useEffect, useState } from 'react';
import { useAppLogic } from './hooks/useAppLogic';
import { useToast } from './hooks/useToast';
import { useValidationError } from './hooks/useValidationError';
import { errorService } from './services/errorService';

import SettingsModal from './SettingsModal';
import ConfigWizard from './components/ConfigWizard';
import FeatureTour from './components/FeatureTour';
import Header from './components/Header';
import ChatInput from './components/InputSection';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';
import ToastContainer from './components/ToastContainer';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorPanel from './components/ErrorPanel';
import ErrorCard from './components/ErrorCard';
import { HistoryPanel } from './components/HistoryPanel';
import { PerformancePanel } from './components/PerformancePanel';

const WIZARD_COMPLETED_KEY = 'prisma-wizard-completed';
const TOUR_COMPLETED_KEY = 'prisma-tour-completed';

const App = () => {
  const [showWizard, setShowWizard] = useState(false);
  const [showTour, setShowTour] = useState(false);
  const [showErrorPanel, setShowErrorPanel] = useState(false);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [showPerformancePanel, setShowPerformancePanel] = useState(false);
  const {
    sessions,
    currentSessionId,
    messages,
    query,
    setQuery,
    selectedModel,
    setSelectedModel,
    config,
    setConfig,
    isSidebarOpen,
    setIsSidebarOpen,
    isSettingsOpen,
    setIsSettingsOpen,
    appState,
    managerAnalysis,
    experts,
    finalOutput,
    degradationStatus,
    processStartTime,
    processEndTime,
    handleRun,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    stopDeepThink,
    focusTrigger
  } = useAppLogic();

  const { toasts, showError, removeToast, dismissToast } = useToast();
  const { validationError, isErrorVisible, dismissError } = useValidationError();

  // Check if wizard should be shown on first launch
  useEffect(() => {
    const wizardCompleted = localStorage.getItem(WIZARD_COMPLETED_KEY);
    const hasApiKey = config.customApiKey && config.customApiKey.trim() !== '';

    // Show wizard if not completed and no API key configured
    if (!wizardCompleted && !hasApiKey) {
      setShowWizard(true);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = errorService.addListener((error, errorId) => {
      const title = error.userMessage || error.message;
      const message = error.suggestedAction || 'An error occurred';

      showError(title, message, error);
    });

    return () => {
      unsubscribe();
    };
  }, [showError]);

  const handleWizardComplete = (updatedConfig: typeof config) => {
    setConfig(updatedConfig);
    localStorage.setItem(WIZARD_COMPLETED_KEY, 'true');
    setShowWizard(false);

    // Show feature tour after wizard completes (if not already completed)
    const tourCompleted = localStorage.getItem(TOUR_COMPLETED_KEY);
    if (!tourCompleted) {
      setTimeout(() => setShowTour(true), 500);
    }
  };

  const handleWizardClose = () => {
    localStorage.setItem(WIZARD_COMPLETED_KEY, 'true');
    setShowWizard(false);
  };

  const handleTourComplete = () => {
    localStorage.setItem(TOUR_COMPLETED_KEY, 'true');
    setShowTour(false);
  };

  const handleTourClose = () => {
    setShowTour(false);
  };

  return (
    <ErrorBoundary>
      <div className="flex flex-col h-screen bg-white text-slate-800 font-sans selection:bg-blue-100 selection:text-blue-900">
        <ToastContainer
          toasts={toasts}
          onClose={removeToast}
          onDismiss={dismissToast}
        />

        <ErrorPanel
          isOpen={showErrorPanel}
          onClose={() => setShowErrorPanel(false)}
        />

        <HistoryPanel
          isOpen={showHistoryPanel}
          onClose={() => setShowHistoryPanel(false)}
        />

        <PerformancePanel
          isOpen={showPerformancePanel}
          onClose={() => setShowPerformancePanel(false)}
        />

        <ConfigWizard
          isOpen={showWizard}
          onClose={handleWizardClose}
          onComplete={handleWizardComplete}
          initialConfig={config}
        />

        <FeatureTour
          isOpen={showTour}
          onClose={handleTourClose}
          onComplete={handleTourComplete}
        />

        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          config={config}
          setConfig={setConfig}
          model={selectedModel}
        />

        <Header
          selectedModel={selectedModel}
          setSelectedModel={setSelectedModel}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
          onNewChat={handleNewChat}
          onOpenTour={() => setShowTour(true)}
          onOpenErrorPanel={() => setShowErrorPanel(true)}
          onOpenHistoryPanel={() => setShowHistoryPanel(true)}
          onOpenPerformancePanel={() => setShowPerformancePanel(true)}
          config={config}
        />

      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar 
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={handleSelectSession}
          onNewChat={handleNewChat}
          onDeleteSession={handleDeleteSession}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-white relative">
          <ChatArea
            messages={messages}
            appState={appState}
            managerAnalysis={managerAnalysis}
            experts={experts}
            finalOutput={finalOutput}
            degradationStatus={degradationStatus}
            processStartTime={processStartTime}
            processEndTime={processEndTime}
          />

          {/* Validation Error Card Overlay */}
          {isErrorVisible && validationError && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/20 backdrop-blur-sm">
              <ErrorCard
                error={validationError}
                onClose={dismissError}
                onOpenSettings={() => {
                  dismissError();
                  setIsSettingsOpen(true);
                }}
              />
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-4 pb-6 flex justify-center bg-gradient-to-t from-white via-white/80 to-transparent">
            <div className="pointer-events-auto w-full max-w-4xl">
              <ChatInput 
                query={query} 
                setQuery={setQuery} 
                onRun={handleRun} 
                onStop={stopDeepThink}
                appState={appState} 
                focusTrigger={focusTrigger}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
    </ErrorBoundary>
  );
};

export default App;
