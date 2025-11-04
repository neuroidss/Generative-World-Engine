import React, { useState, useMemo } from 'react';
import { GameState } from '../hooks/useGameLogic';
import { LANGUAGES } from '../constants';
import { IconSoundOn, IconSoundOff, IconSpinner, IconPlay, IconPause, IconDebug, IconClose } from './icons';
import { AIModel, APIConfig, ModelProvider } from '../types';

interface HeaderProps {
    t: any;
    gameState: GameState;
    language: keyof typeof LANGUAGES;
    availableModels: AIModel[];
    selectedModel: AIModel;
    isMuted: boolean;
    narrationStatus: 'idle' | 'generating' | 'playing';
    isDonghuaModeActive: boolean;
    isDebugPanelOpen: boolean;
    onLanguageChange: (lang: keyof typeof LANGUAGES) => void;
    onModelChange: (model: AIModel) => void;
    onToggleMute: () => void;
    onToggleDonghua: () => void;
    onToggleDebug: () => void;
    apiConfig: APIConfig;
    setApiConfig: React.Dispatch<React.SetStateAction<APIConfig>>;
    ollamaState: { loading: boolean; error: string | null };
    ollamaModels: AIModel[];
    fetchOllamaModels: () => void;
}

const SettingsModal: React.FC<{
    isOpen: boolean,
    onClose: () => void,
    apiConfig: APIConfig,
    setApiConfig: React.Dispatch<React.SetStateAction<APIConfig>>,
    selectedProvider: ModelProvider,
    ollamaState: { loading: boolean, error: string | null },
    fetchOllamaModels: () => void
}> = ({ isOpen, onClose, apiConfig, setApiConfig, selectedProvider, ollamaState, fetchOllamaModels }) => {
    if (!isOpen) return null;

    const renderProviderConfig = () => {
        const commonInputClasses = "w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg p-2 text-sm";
        const commonLabelClasses = "text-sm font-semibold text-gray-300";

        if (selectedProvider === ModelProvider.GoogleAI) {
            return (
                <div>
                    <label htmlFor="google-api-key" className={commonLabelClasses}>Google AI API Key:</label>
                    <input id="google-api-key" type="password" placeholder="Enter your Gemini API Key..."
                        value={apiConfig.googleAIAPIKey || ''}
                        onChange={(e) => setApiConfig(c => ({ ...c, googleAIAPIKey: e.target.value }))}
                        className={commonInputClasses} autoComplete="off"
                    />
                </div>
            )
        }
        if (selectedProvider === ModelProvider.Ollama) {
            return (
                <div>
                    <label htmlFor="ollama-host" className={commonLabelClasses}>Ollama Host URL:</label>
                    <div className="flex items-center gap-2">
                        <input id="ollama-host" type="text" placeholder="http://localhost:11434"
                            value={apiConfig.ollamaHost || ''}
                            onChange={(e) => setApiConfig(c => ({ ...c, ollamaHost: e.target.value }))}
                            className={commonInputClasses}
                        />
                         <button onClick={fetchOllamaModels} disabled={ollamaState.loading} className="p-2 mt-1 bg-gray-700 rounded-lg hover:bg-gray-600 disabled:opacity-50 flex-shrink-0" title="Refresh model list">
                            {ollamaState.loading ? <IconSpinner className="w-5 h-5" /> : 
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h5M20 20v-5h-5M20 4h-5v5M4 20h5v-5" /></svg>
                            }
                        </button>
                    </div>
                     {ollamaState.error && <p className="text-xs text-red-400 mt-1">{ollamaState.error}</p>}
                </div>
            )
        }
        return null;
    }

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-600 p-6 rounded-lg max-w-md w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">API Configuration</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700"><IconClose className="w-6 h-6" /></button>
                </div>
                <div className="space-y-4">
                    {renderProviderConfig()}
                </div>
            </div>
        </div>
    );
};


const Header: React.FC<HeaderProps> = (props) => {
    const { t, gameState, language, availableModels, selectedModel, isMuted, narrationStatus, isDonghuaModeActive, isDebugPanelOpen,
        onLanguageChange, onModelChange, onToggleMute, onToggleDonghua, onToggleDebug, apiConfig, setApiConfig, ollamaState, ollamaModels, fetchOllamaModels } = props;

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const selectedProvider = selectedModel.provider;

    const modelsForProvider = useMemo(() => {
        if (selectedProvider === ModelProvider.Ollama) {
            return ollamaModels;
        }
        return availableModels.filter(m => m.provider === selectedProvider);
    }, [selectedProvider, availableModels, ollamaModels]);

    const handleProviderChange = (newProvider: ModelProvider) => {
        const firstModelForProvider = newProvider === ModelProvider.Ollama ? ollamaModels[0] : availableModels.find(m => m.provider === newProvider);
        if (firstModelForProvider) {
            onModelChange(firstModelForProvider);
        } else if (newProvider === ModelProvider.Ollama) {
            // If no ollama models are fetched yet, create a placeholder
            onModelChange({id: 'unselected', name: 'Select Model...', provider: ModelProvider.Ollama});
        }
    };
    
    return (
        <>
        <header className="flex flex-wrap justify-between items-center mb-6 gap-y-4">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <div className='flex items-center gap-2 sm:gap-4'>
                {gameState === 'playing' && (
                    <button onClick={onToggleDonghua} className={`px-3 py-1 rounded-full flex items-center gap-2 transition-colors ${isDonghuaModeActive ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-600 hover:bg-gray-500'}`} title="Toggle Donghua Mode">
                        {isDonghuaModeActive ? <IconPause className="w-4 h-4" /> : <IconPlay className="w-4 h-4" />}
                        <span className="text-sm hidden sm:inline">{isDonghuaModeActive ? t.donghuaPause : t.donghuaStart}</span>
                    </button>
                )}
                
                <div className="flex items-center gap-1 bg-gray-700 border border-gray-600 rounded">
                    <select value={selectedProvider} onChange={(e) => handleProviderChange(e.target.value as ModelProvider)} className="bg-transparent pl-2 pr-1 py-1 text-white text-sm focus:outline-none">
                        {Object.values(ModelProvider).map(provider => (
                            <option key={provider} value={provider}>{provider}</option>
                        ))}
                    </select>
                    <div className="w-px h-4 bg-gray-500"></div>
                     <select value={selectedModel.id} onChange={(e) => {
                         const model = modelsForProvider.find(m => m.id === e.target.value);
                         if(model) onModelChange(model);
                     }} className="bg-transparent pl-1 pr-2 py-1 text-white text-sm focus:outline-none" disabled={modelsForProvider.length === 0}>
                        {modelsForProvider.length > 0 ? (
                            modelsForProvider.map(model => (
                                <option key={model.id} value={model.id}>{model.name}</option>
                            ))
                        ) : (
                            <option value="unselected">
                                {selectedProvider === ModelProvider.Ollama ? 'Click refresh ↻' : 'No models'}
                            </option>
                        )}
                    </select>
                    <button onClick={() => setIsSettingsOpen(true)} className="p-1.5 hover:bg-gray-600 rounded-r" title="Configure API">⚙️</button>
                </div>
                
                <select value={language} onChange={(e) => onLanguageChange(e.target.value as keyof typeof LANGUAGES)} className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm">
                    {Object.entries(LANGUAGES).map(([key, name]) => (
                        <option key={key} value={key}>{name}</option>
                    ))}
                </select>

                <div className="flex items-center gap-2">
                    <button onClick={onToggleMute} className="p-2 rounded-full hover:bg-gray-700">
                        {isMuted ? <IconSoundOff /> : <IconSoundOn />}
                    </button>
                    {narrationStatus !== 'idle' && <IconSpinner className="w-5 h-5 text-blue-400" />}
                </div>

                <button onClick={onToggleDebug} className="p-2 rounded-full hover:bg-gray-700" title="Toggle Debug Panel">
                    <IconDebug className={`w-6 h-6 ${isDebugPanelOpen ? 'text-yellow-400' : ''}`} />
                </button>
            </div>
        </header>
        <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            apiConfig={apiConfig}
            setApiConfig={setApiConfig}
            selectedProvider={selectedProvider}
            ollamaState={ollamaState}
            fetchOllamaModels={fetchOllamaModels}
        />
        </>
    );
};

export default Header;
