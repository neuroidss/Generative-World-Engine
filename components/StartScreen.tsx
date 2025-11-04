import React, { useState, useRef, ChangeEvent } from 'react';
import { SavedWorld, SavedWorldsMap } from '../types';
import { PRESET_WORLDS } from '../constants';
import { RecordingTarget } from '../hooks/useGameLogic';
import { IconPlay, IconUpload, IconMicrophone } from './icons';

interface StartScreenProps {
    t: any;
    savedWorlds: SavedWorldsMap;
    lastPlayedId: string | null;
    isRecording: boolean;
    recordingTarget: RecordingTarget | null;
    language: keyof typeof PRESET_WORLDS;
    onStartNewWorld: (config: { name: string; prompt?: string; worldData?: SavedWorld; loreSource?: string; playerRole?: string; }) => void;
    onLoadWorld: (worldId: string) => void;
    onContinueLastWorld: () => void;
    onImport: (file: File) => void;
    onToggleRecording: (target: RecordingTarget) => void;
    startScreenPrompt: string;
    setStartScreenPrompt: (prompt: string) => void;
}

const StartScreen: React.FC<StartScreenProps> = ({
    t,
    savedWorlds,
    lastPlayedId,
    isRecording,
    recordingTarget,
    language,
    onStartNewWorld,
    onLoadWorld,
    onContinueLastWorld,
    onImport,
    onToggleRecording,
    startScreenPrompt,
    setStartScreenPrompt
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [loreSource, setLoreSource] = useState('');
    const [playerRole, setPlayerRole] = useState('');

    const handleImportChange = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            onImport(file);
        }
        // Reset file input to allow re-uploading the same file
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const lastPlayedWorld = lastPlayedId ? savedWorlds[lastPlayedId] : null;

    return (
        <div className="max-w-4xl mx-auto flex flex-col gap-8">
            {lastPlayedWorld && (
                <div className="bg-gray-800/50 p-6 rounded-lg text-center">
                    <h2 className="text-2xl font-bold mb-4">{t.continueLast}</h2>
                    <p className="text-lg mb-4 text-gray-300">"{lastPlayedWorld.name}"</p>
                    <button onClick={onContinueLastWorld} className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors text-xl font-bold flex items-center gap-2 mx-auto">
                        <IconPlay /> {t.continue}
                    </button>
                </div>
            )}

            <div className="bg-gray-800/50 p-6 rounded-lg">
                <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">{t.startNew}</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {PRESET_WORLDS[language].map(world => (
                        <button 
                            key={world.name} 
                            onClick={() => onStartNewWorld({ 
                                prompt: world.prompt, 
                                name: world.name, 
                                worldData: world.worldData,
                                loreSource: world.loreSource,
                                playerRole: world.playerRole,
                            })} 
                            className="p-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-left"
                        >
                            <h3 className="font-semibold">{world.name}</h3>
                        </button>
                    ))}
                </div>
                <div className="mt-6">
                    <h3 className="font-semibold mb-2">{t.createOwn}</h3>
                    <div className='space-y-2'>
                        <input
                             type="text"
                            className="w-full p-2 border rounded bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            value={loreSource}
                            onChange={(e) => setLoreSource(e.target.value)}
                            placeholder={t.loreSourcePlaceholder}
                        />
                         <input
                             type="text"
                            className="w-full p-2 border rounded bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                            value={playerRole}
                            onChange={(e) => setPlayerRole(e.target.value)}
                            placeholder={t.playerRolePlaceholder}
                        />
                        <div className="flex gap-2">
                            <textarea
                                className="flex-grow w-full p-2 border rounded bg-gray-700 border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                                rows={2}
                                value={startScreenPrompt}
                                onChange={(e) => setStartScreenPrompt(e.target.value)}
                                placeholder={t.createOwnPlaceholder}
                            />
                            <button 
                                onClick={() => onToggleRecording('prompt')} 
                                className={`p-2 rounded transition-colors self-start ${isRecording && recordingTarget === 'prompt' ? 'bg-red-600' : 'bg-gray-600 hover:bg-gray-500'} disabled:bg-gray-800`}
                            >
                                <IconMicrophone className="w-6 h-6"/>
                            </button>
                        </div>
                    </div>
                    <button onClick={() => onStartNewWorld({ prompt: startScreenPrompt, name: "Custom World", loreSource, playerRole })} disabled={!startScreenPrompt.trim()} className="mt-2 px-6 py-2 bg-blue-600 rounded hover:bg-blue-700 disabled:bg-gray-500 transition-colors">
                        {t.create}
                    </button>
                </div>
            </div>

            {(Object.keys(savedWorlds).length > 0) && (
                <div className="bg-gray-800/50 p-6 rounded-lg">
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-600 pb-2">{t.loadSave}</h2>
                    <div className="space-y-2">
                        {Object.values(savedWorlds).map((world: SavedWorld) => (
                            <button key={world.id} onClick={() => onLoadWorld(world.id)} className="w-full text-left p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors">
                                {world.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="bg-gray-800/50 p-6 rounded-lg text-center">
                <input type="file" accept=".zip,.json" onChange={handleImportChange} className="hidden" ref={fileInputRef} />
                <button onClick={() => fileInputRef.current?.click()} className="px-6 py-2 bg-gray-600 rounded hover:bg-gray-500 transition-colors flex items-center gap-2 mx-auto">
                    <IconUpload /> {t.importWorld}
                </button>
            </div>
        </div>
    );
};

export default StartScreen;
