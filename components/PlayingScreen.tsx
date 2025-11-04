import React, { useRef, useEffect, useState } from 'react';
import type { WorldState, PlayerAction, Entity, HistoryEntry } from '../types';
import { GameState, RecordingTarget } from '../hooks/useGameLogic';
import { IconSpinner, IconSend, IconMicrophone, IconDownload, IconClose, IconImage } from './icons';

// --- Sub-components ---
const DetailedEntityModal: React.FC<{ entity: Entity, t: any, onClose: () => void }> = ({ entity, t, onClose }) => (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50" onClick={onClose}>
        <div className="bg-gray-800 p-6 rounded-lg max-w-lg w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-2xl font-bold mb-2">{entity.name}</h2>
            <p className="text-gray-300">{entity.description}</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 bg-blue-600 rounded">{t.close}</button>
        </div>
    </div>
);

// --- Main Component ---
interface PlayingScreenProps {
    t: any;
    gameState: GameState;
    worldState: WorldState;
    history: HistoryEntry[];
    actions: PlayerAction[];
    playerThought: string | null;
    customAction: string;
    setCustomAction: (action: string) => void;
    isDonghuaModeActive: boolean;
    isRecording: boolean;
    recordingTarget: RecordingTarget | null;
    onAction: (action: PlayerAction) => void;
    onCustomAction: (transcript?: string) => void;
    onRewind: (index: number) => void;
    onDetailEntity: (entity: Entity) => void;
    onReturnToStart: () => void;
    onExport: (jsonOnly?: boolean) => void;
    onToggleRecording: (target: RecordingTarget) => void;
    onRegenerateImage: (index: number) => void;
}

const PlayingScreen: React.FC<PlayingScreenProps> = (props) => {
    const { t, gameState, worldState, history, actions, playerThought, customAction, setCustomAction, isDonghuaModeActive, isRecording, recordingTarget,
            onAction, onCustomAction, onRewind, onDetailEntity, onReturnToStart, onExport, onToggleRecording, onRegenerateImage } = props;
    
    const [detailedEntity, setDetailedEntity] = useState<Entity | null>(null);
    const chronicleEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        chronicleEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [history, playerThought]);

    const handleDetailEntityClick = (entity: Entity) => {
        setDetailedEntity(entity);
        onDetailEntity(entity); // This will fetch more details
    };
    
    const handleCustomActionSubmit = () => {
        onCustomAction();
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <div className="lg:col-span-3 space-y-4">
                <img src={worldState.imageUrl || `https://via.placeholder.com/1024x768/111827/475569.png?text=${encodeURIComponent(worldState.description.substring(0, 50))}...`} alt="World visualization" className="rounded-lg shadow-lg w-full" />
                <div className="p-4 bg-gray-800/50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">{t.entities}</h3>
                    <ul className="flex flex-wrap gap-x-4 gap-y-1">
                        {worldState.entities.map(entity => (
                            <li key={entity.id} onClick={() => handleDetailEntityClick(entity)} className="cursor-pointer hover:text-blue-400 underline decoration-dotted">
                                {entity.name}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            <div className="lg:col-span-2 space-y-4 flex flex-col" style={{maxHeight: 'calc(100vh - 120px)'}}>
                 <div className="flex-grow p-4 bg-gray-800/50 rounded-lg flex flex-col overflow-hidden">
                    <div className="flex-shrink-0 border-b border-gray-700 mb-4">
                        <h3 className="text-lg font-semibold text-gray-200">{t.chronicles}</h3>
                    </div>

                    <div className="flex-grow overflow-y-auto -mr-2 pr-2">
                        <div className="space-y-4">
                            {history.map((entry, index) => (
                                <div key={index} className="group relative border-l-2 border-transparent hover:border-blue-500 pl-2 transition-colors">
                                    <p className="font-semibold text-gray-400 text-sm cursor-pointer" onClick={() => onRewind(index)}>{entry.playerAction}</p>
                                    <p className="cursor-pointer" onClick={() => onRewind(index)}>{entry.chronicleEntry}</p>
                                    {!entry.worldState.imageUrl && (
                                        <button onClick={() => onRegenerateImage(index)} title={t.regenerateImage} className="absolute top-0 right-0 p-1 bg-gray-700/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                            <IconImage className="w-4 h-4 text-gray-300" />
                                        </button>
                                    )}
                                    {entry.worldState.imageUrl === 'loading' && (
                                        <div className="absolute top-0 right-0 p-1">
                                            <IconSpinner className="w-4 h-4 text-blue-400" />
                                        </div>
                                    )}
                                </div>
                            ))}
                            {playerThought && (
                                <div className="pl-2">
                                    <h4 className="font-semibold text-gray-400 text-sm mb-1">{t.playerThought}</h4>
                                    <p className="italic text-gray-400">"{playerThought}"</p>
                                </div>
                            )}
                            {(gameState === 'loading' || gameState === 'translating') && <div className="flex items-center gap-2 text-gray-400"><IconSpinner className="w-4 h-4" /><span>...</span></div>}
                            <div ref={chronicleEndRef} />
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 p-4 bg-gray-800/50 rounded-lg">
                    <h3 className="font-bold text-lg mb-2">{t.actions}</h3>
                    <div className="grid grid-cols-1 gap-2">
                        {actions.map(action => (
                            <button key={action.id} onClick={() => onAction(action)} disabled={gameState !== 'playing'} className="text-left p-3 bg-gray-70t-700 rounded hover:bg-gray-600 transition-colors disabled:bg-gray-800 disabled:text-gray-500">
                                {action.description}
                            </button>
                        ))}
                    </div>
                    <div className="mt-4 flex gap-2">
                        <input type="text" value={customAction} onChange={(e) => setCustomAction(e.target.value)} placeholder={t.customActionPlaceholder}
                            className="flex-grow p-2 border rounded bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            onKeyDown={(e) => e.key === 'Enter' && handleCustomActionSubmit()} disabled={gameState !== 'playing' || isDonghuaModeActive}
                        />
                        <button onClick={() => onToggleRecording('action')} disabled={gameState !== 'playing' || isDonghuaModeActive}
                            className={`p-2 rounded transition-colors ${isRecording && recordingTarget === 'action' ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'} disabled:bg-gray-800`}>
                            <IconMicrophone className="w-6 h-6"/>
                        </button>
                        <button onClick={handleCustomActionSubmit} disabled={gameState !== 'playing' || !customAction.trim() || isDonghuaModeActive} className="p-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors disabled:bg-gray-500">
                            <IconSend className="w-6 h-6"/>
                        </button>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700 flex flex-wrap gap-2">
                        <button onClick={onReturnToStart} className="text-sm px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded">{t.mainMenu}</button>
                        <button onClick={() => onExport(false)} className="text-sm px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded flex items-center gap-1"><IconDownload className="w-4 h-4"/> {t.export}</button>
                        <button onClick={() => onExport(true)} className="text-sm px-3 py-1 bg-gray-600 hover:bg-gray-500 rounded flex items-center gap-1"><IconDownload className="w-4 h-4"/> {t.exportJson}</button>
                    </div>
                </div>
            </div>
            {detailedEntity && <DetailedEntityModal entity={detailedEntity} t={t} onClose={() => setDetailedEntity(null)} />}
        </div>
    );
};

export default PlayingScreen;