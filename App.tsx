import React from 'react';
import { useGameLogic } from './hooks/useGameLogic';
import { LANGUAGES, AI_MODELS } from './constants';
import Header from './components/Header';
import StartScreen from './components/StartScreen';
import PlayingScreen from './components/PlayingScreen';
import DebugPanel from './components/DebugPanel';
import { IconSpinner } from './components/icons';

const App: React.FC = () => {
    const {
        // State
        gameState,
        language,
        t,
        worldState,
        savedWorlds,
        lastPlayedId,
        history,
        actions,
        playerThought,
        customAction,
        isMuted,
        narrationStatus,
        isDonghuaModeActive,
        isDebugPanelOpen,
        debugInfo,
        startScreenPrompt,
        selectedModel,
        apiConfig,
        ollamaState,
        ollamaModels,
        // Handlers
        setCustomAction,
        setStartScreenPrompt,
        setApiConfig,
        handleLanguageChange,
        handleStartNewWorld,
        handleLoadWorld,
        handleContinueLastWorld,
        handleImport,
        handleReturnToStart,
        handleAction,
        handleCustomAction,
        handleRewind,
        handleDetailEntity,
        handleExport,
        handleToggleRecording,
        toggleDonghuaMode,
        setIsMuted,
        setIsDebugPanelOpen,
        isRecording,
        recordingTarget,
        handleRegenerateImage,
        handleModelChange,
        fetchOllamaModels,
    } = useGameLogic();

    const renderLoadingScreen = () => {
         let message = t.creatingWorld;
         if (gameState === 'translating') {
             message = `Translating to ${LANGUAGES[language]}...`;
         }
         return <div className="flex h-64 flex-col items-center justify-center gap-4 text-xl"><IconSpinner className="w-12 h-12" /> <p>{message}</p></div>
    }

    const renderContent = () => {
        if (gameState === 'start') {
            return (
                <StartScreen
                    t={t}
                    savedWorlds={savedWorlds}
                    lastPlayedId={lastPlayedId}
                    isRecording={isRecording}
                    recordingTarget={recordingTarget}
                    onStartNewWorld={handleStartNewWorld}
                    onLoadWorld={handleLoadWorld}
                    onContinueLastWorld={handleContinueLastWorld}
                    onImport={handleImport}
                    onToggleRecording={handleToggleRecording}
                    language={language}
                    startScreenPrompt={startScreenPrompt}
                    setStartScreenPrompt={setStartScreenPrompt}
                />
            );
        }

        if (gameState === 'playing' || gameState === 'loading' || gameState === 'translating') {
            if (!worldState) {
                 return renderLoadingScreen();
            }
            return (
                <PlayingScreen
                    t={t}
                    gameState={gameState}
                    worldState={worldState}
                    history={history}
                    actions={actions}
                    playerThought={playerThought}
                    customAction={customAction}
                    setCustomAction={setCustomAction}
                    isDonghuaModeActive={isDonghuaModeActive}
                    isRecording={isRecording}
                    recordingTarget={recordingTarget}
                    onAction={handleAction}
                    onCustomAction={handleCustomAction}
                    onRewind={handleRewind}
                    onDetailEntity={handleDetailEntity}
                    onReturnToStart={handleReturnToStart}
                    onExport={handleExport}
                    onToggleRecording={handleToggleRecording}
                    onRegenerateImage={handleRegenerateImage}
                />
            );
        }
        
        return null;
    };

    return (
        <main className="bg-gray-900 text-white min-h-screen p-4 sm:p-6">
            <div className="max-w-7xl mx-auto">
                <Header
                    t={t}
                    gameState={gameState}
                    language={language}
                    availableModels={AI_MODELS}
                    selectedModel={selectedModel}
                    isMuted={isMuted}
                    narrationStatus={narrationStatus}
                    isDonghuaModeActive={isDonghuaModeActive}
                    isDebugPanelOpen={isDebugPanelOpen}
                    onLanguageChange={handleLanguageChange}
                    onModelChange={handleModelChange}
                    onToggleMute={() => setIsMuted(!isMuted)}
                    onToggleDonghua={toggleDonghuaMode}
                    onToggleDebug={() => setIsDebugPanelOpen(!isDebugPanelOpen)}
                    apiConfig={apiConfig}
                    setApiConfig={setApiConfig}
                    ollamaState={ollamaState}
                    ollamaModels={ollamaModels}
                    fetchOllamaModels={fetchOllamaModels}
                />
                {renderContent()}
            </div>
            <DebugPanel isOpen={isDebugPanelOpen} debugInfo={debugInfo} onClose={() => setIsDebugPanelOpen(false)} />
        </main>
    );
};

export default App;
