import React from 'react';
import { useAppLogic } from './hooks/useAppLogic';

import SettingsModal from './SettingsModal';
import Header from './components/Header';
import ChatInput from './components/InputSection';
import Sidebar from './components/Sidebar';
import ChatArea from './components/ChatArea';

interface AppProps {
  initialSessionId?: string;
}

const App = ({ initialSessionId }: AppProps) => {
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
    synthesisThoughts,
    processStartTime,
    processEndTime,
    handleRun,
    handleNewChat,
    handleSelectSession,
    handleDeleteSession,
    stopDeepThink,
    focusTrigger
  } = useAppLogic();

  return (
    <div className="flex flex-col h-screen bg-background text-foreground font-sans selection:bg-blue-100 dark:selection:bg-blue-900 selection:text-blue-900 dark:selection:text-blue-100">
      
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

        <main className="flex-1 flex flex-col min-w-0 bg-background relative">
          <ChatArea 
            messages={messages}
            appState={appState}
            managerAnalysis={managerAnalysis}
            experts={experts}
            finalOutput={finalOutput}
            synthesisThoughts={synthesisThoughts}
            processStartTime={processStartTime}
            processEndTime={processEndTime}
          />

          <div className="absolute bottom-0 left-0 right-0 z-20 pointer-events-none p-4 pb-6 flex justify-center bg-gradient-to-t from-background via-background/80 to-transparent">
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
  );
};

export default App;
