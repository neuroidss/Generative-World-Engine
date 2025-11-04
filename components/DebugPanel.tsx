import React from 'react';
import { IconClose } from './icons';
import { WorldState } from '../types';

interface DebugInfo {
    apiCallCount: number;
    lastApiStatus: string;
    errors: string[];
    groundingChunks?: any[];
    gmInfo?: WorldState['gmInfo'];
}

interface DebugPanelProps {
    debugInfo: DebugInfo;
    isOpen: boolean;
    onClose: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ debugInfo, isOpen, onClose }) => {
    if (!isOpen) return null;

    const hasGroundingData = debugInfo.groundingChunks && debugInfo.groundingChunks.length > 0;
    const hasGmInfo = !!debugInfo.gmInfo;

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-gray-900/90 backdrop-blur-sm border-t border-gray-700 p-4 shadow-2xl z-50 max-h-80 overflow-y-auto">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-2">
                    <h3 className="font-bold text-lg text-yellow-400">Debug Panel</h3>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-700">
                        <IconClose className="w-6 h-6" />
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm font-mono">
                    {/* Column 1: Status & Errors */}
                    <div className="space-y-4">
                        <div>
                            <p><span className="font-semibold text-gray-400">API Calls:</span> {debugInfo.apiCallCount}</p>
                            <p className="whitespace-nowrap overflow-hidden text-ellipsis"><span className="font-semibold text-gray-400">Status:</span> {debugInfo.lastApiStatus}</p>
                        </div>
                        <div>
                            <p className="font-semibold text-gray-400 mb-1">Errors ({debugInfo.errors.length}):</p>
                            {debugInfo.errors.length > 0 ? (
                                <ul className="list-disc list-inside bg-red-900/20 p-2 rounded max-h-32 overflow-y-auto">
                                    {debugInfo.errors.map((error, index) => (
                                        <li key={index} className="text-red-400">{error}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-gray-500">None so far.</p>
                            )}
                        </div>
                    </div>

                    {/* Column 2: GM State */}
                    {hasGmInfo && (
                        <div className="space-y-4 max-h-60 overflow-y-auto">
                             <div>
                                <h4 className="font-semibold text-purple-400 mb-1">GM: World Summary</h4>
                                {debugInfo.gmInfo?.worldSummary ? (
                                    <p className="bg-purple-900/20 p-2 rounded text-xs">{debugInfo.gmInfo.worldSummary}</p>
                                ) : <p className="text-gray-500 text-xs">No summary.</p>}
                            </div>
                            <div>
                                <h4 className="font-semibold text-purple-400 mb-1">GM: Next Canon Event</h4>
                                {debugInfo.gmInfo?.nextCanonicalEvent ? (
                                    <p className="bg-purple-900/20 p-2 rounded text-xs">{debugInfo.gmInfo.nextCanonicalEvent}</p>
                                ) : <p className="text-gray-500 text-xs">Canon complete or not defined.</p>}
                            </div>
                            <div>
                                <h4 className="font-semibold text-purple-400 mb-1">GM: Last Deviation Analysis</h4>
                                {debugInfo.gmInfo?.deviationAnalysis ? (
                                    <p className="bg-purple-900/20 p-2 rounded text-xs italic">{debugInfo.gmInfo.deviationAnalysis}</p>
                                ) : <p className="text-gray-500 text-xs">No deviation logged.</p>}
                            </div>
                             <div>
                                <h4 className="font-semibold text-purple-400 mb-1">GM: Player Goal</h4>
                                {debugInfo.gmInfo?.goal ? (
                                    <div className="bg-purple-900/20 p-2 rounded">
                                        <p className="font-bold text-xs">{debugInfo.gmInfo.goal.title}</p>
                                        <ul className="list-disc list-inside text-xs">
                                            {debugInfo.gmInfo.goal.steps.map(step => (
                                                <li key={step.id} className={step.completed ? 'line-through text-gray-500' : ''}>{step.description}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : <p className="text-gray-500">No goal set.</p>}
                            </div>
                             <div>
                                <h4 className="font-semibold text-purple-400 mb-1">GM: Entities in Scene</h4>
                                <ul className="bg-purple-900/20 p-2 rounded text-xs space-y-1">
                                    {debugInfo.gmInfo?.entities.map(entity => (
                                        <li key={entity.id}>
                                            <span className="font-semibold text-gray-300">{entity.name}</span>
                                            {entity.state && <span className="text-purple-300 ml-2">[{entity.state}]</span>}
                                            <p className="text-gray-400 italic text-xs">{entity.description}</p>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* Column 3: Grounding */}
                    {hasGroundingData && (
                        <div>
                            <p className="font-semibold text-gray-400 mb-1">Grounding Sources ({debugInfo.groundingChunks.length}):</p>
                            <ul className="list-disc list-inside bg-blue-900/20 p-2 rounded max-h-40 overflow-y-auto text-sm">
                                {debugInfo.groundingChunks.map((chunk, index) => (
                                    chunk.web && (
                                        <li key={index} className="truncate">
                                            <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline" title={chunk.web.title || chunk.web.uri}>
                                                {chunk.web.title || chunk.web.uri}
                                            </a>
                                        </li>
                                    )
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DebugPanel;