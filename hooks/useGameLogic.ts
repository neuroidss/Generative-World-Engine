

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import { aiService } from '../services/aiService';
import { playBase64Audio } from '../services/geminiService';
import { dbService } from '../services/dbService';
import type { WorldState, PlayerAction, Entity, HistoryEntry, GoalStep, SavedWorld, SavedWorldsMap, MasterEntity, AIModel, APIConfig } from '../types';
import { ModelProvider } from '../types';
import { AI_MODELS } from '../constants';

// --- Types for Web Speech API to fix TypeScript errors ---
interface SpeechRecognitionEvent extends Event {
    results: SpeechRecognitionResultList;
    resultIndex: number;
}
interface SpeechRecognitionResultList { [index: number]: SpeechRecognitionResult; length: number; }
interface SpeechRecognitionResult { [index: number]: SpeechRecognitionAlternative; isFinal: boolean; length: number; }
interface SpeechRecognitionAlternative { transcript: string; confidence: number; }
interface SpeechRecognitionErrorEvent extends Event { error: string; }
interface SpeechRecognition extends EventTarget {
    continuous: boolean; lang: string; interimResults: boolean;
    onresult: (event: SpeechRecognitionEvent) => void;
    onend: () => void;
    onerror: (event: SpeechRecognitionErrorEvent) => void;
    start(): void; stop(): void;
}
interface SpeechRecognitionStatic { new(): SpeechRecognition; }

// --- Constants & i18n ---
const LAST_PLAYED_ID_KEY = 'generative-world-engine-last-played-id';
export const LANGUAGES = { 'en': 'English', 'ru': 'Русский' };
export const UI_STRINGS = {
    en: {
        title: "Generative World Engine", continueLast: "Continue Last Adventure?", continue: "Continue", startNew: "Start a New World", createOwn: "Create Your Own World",
        createOwnPlaceholder: "e.g., A floating city in the clouds, powered by alchemical crystals...", create: "Create", loadSave: "Load a Saved World",
        importWorld: "Import World (.zip, .json)", creatingWorld: "Creating world...", entities: "Entities", chronicles: "Chronicles", actions: "Actions",
        customActionPlaceholder: "Or suggest your own action...", mainMenu: "Main Menu", export: "Export", exportJson: "Export (JSON only)", close: "Close", playerActionPrefix: "Attempt: ",
        playerActionThinking: (action: string) => `You ponder how best to ${action.toLowerCase()}...`, worldCreated: "The world was created.", worldLog: "World Log",
        goal: "Goal", entityState: "Entity States", donghuaStart: "Start Story", donghuaPause: "Pause Story", regenerateImage: "Regenerate Image",
        playerThought: "Inner Monologue", loreSourcePlaceholder: "World/Franchise Names (e.g. Swallowed Star, Battle Through the Heavens)", playerRolePlaceholder: "Player Character Role (e.g., Luo Feng's friend)",
    },
    ru: {
        title: "Генеративный Движок Миров", continueLast: "Продолжить последнее приключение?", continue: "Продолжить", startNew: "Начать новый мир",
        createOwn: "Создать свой мир", createOwnPlaceholder: "Например, летающий город в облаках, питаемый алхимическими кристаллами...", create: "Создать",
        loadSave: "Загрузить сохранение", importWorld: "Импортировать мир (.zip, .json)", creatingWorld: "Создание мира...", entities: "Сущности", chronicles: "Хроники",
        actions: "Действия", customActionPlaceholder: "Или предложите свое действие...", mainMenu: "Главное меню", export: "Экспорт", exportJson: "Экспорт (только JSON)", close: "Закрыть",
        playerActionPrefix: "Попытка: ", playerActionThinking: (action: string) => `Вы обдумываете, как лучше ${action.toLowerCase()}...`, worldCreated: "Мир был создан.",
        worldLog: "Журнал Мира", goal: "Цель", entityState: "Состояния Сущностей", donghuaStart: "Начать историю", donghuaPause: "Поставить историю на паузу",
        regenerateImage: "Пересоздать изображение", playerThought: "Внутренний монолог", loreSourcePlaceholder: "Названия миров/франшиз (напр., Пожиратель звёзд, Боевой континент)", playerRolePlaceholder: "Роль персонажа (напр., подруга Ло Фэна)",
    }
};

interface PresetWorld {
    name: string;
    prompt?: string;
    worldData?: SavedWorld;
    loreSource?: string;
    playerRole?: string;
}

export const PRESET_WORLDS: { [key: string]: PresetWorld[] } = {
    en: [
        {
            name: "Swallowed Star: The Awakened",
            prompt: "The year is 2056. The world has been ravaged by the RR virus, creating monstrous beasts that roam the wastelands outside fortified cities. You are a high school graduate in one of these cities, your future uncertain. As you stand on a rooftop, overlooking the armored walls, you feel a strange energy coursing through you for the first time—a faint, inner power. Down below, a Fighter dojo is recruiting.",
            loreSource: "Swallowed Star",
            playerRole: "A young resident of a post-apocalyptic city who has just awakened their genetic energy."
        },
        {
            name: "BTTH: The Fallen Genius",
            prompt: "Three years ago, you were the prodigy of the Xiao clan, reaching 9 Duan Qi at the age of 11. Now, you are its disgrace. Your Dou Qi has mysteriously vanished, leaving you a cripple in a world that respects only power. Your fiancée from the mighty Nalan clan has just arrived, not for a visit, but to publicly annul your engagement. The shame is unbearable, but a flicker of defiance remains in your heart.",
            loreSource: "Battle Through the Heavens",
            playerRole: "The former genius of the Xiao Clan, Xiao Yan, at the moment of his greatest humiliation."
        },
        {
            name: "A Mortal's Journey: The Seven Mysteries Sect",
            prompt: "Born a commoner, you've managed to enter the Seven Mysteries Sect, a minor Jianghu clan, not as a martial artist, but as an unofficial disciple through a connection. You are given menial tasks and looked down upon. Your innate spiritual roots are poor. In this world of hidden cultivators and ruthless politics, you possess only your wits, extreme caution, and a mysterious small green bottle you've carried since childhood.",
            loreSource: "A Record of a Mortal's Journey to Immortality",
            playerRole: "A young, unremarkable disciple with poor talent but a cautious mind, newly arrived at the Seven Mysteries Sect."
        },
    ],
    ru: [
        {
            name: "Пожиратель звёзд: Пробуждённый",
            prompt: "Год 2056. Мир был разорён вирусом RR, создавшим чудовищных зверей, которые бродят по пустошам за пределами укреплённых городов. Вы — выпускник средней школы в одном из таких городов, ваше будущее неопределённо. Стоя на крыше и глядя на бронированные стены, вы впервые чувствуете, как по вам пробегает странная энергия — слабая внутренняя сила. Внизу додзё Бойцов проводит набор.",
            loreSource: "Пожиратель звёзд",
            playerRole: "Молодой житель постапокалиптического города, только что пробудивший свою генетическую энергию."
        },
        {
            name: "Расколотая битвой синева небес: Падший гений",
            prompt: "Три года назад вы были вундеркиндом клана Сяо, достигнув 9-го уровня Ду Ки в 11 лет. Теперь вы — его позор. Ваша Ду Ки таинственным образом исчезла, оставив вас калекой в мире, который уважает только силу. Ваша невеста из могущественного клана Налан только что прибыла, но не для визита, а чтобы публично расторгнуть вашу помолвку. Стыд невыносим, но в вашем сердце осталась искра неповиновения.",
            loreSource: "Расколотая битвой синева небес",
            playerRole: "Бывший гений клана Сяо, Сяо Янь, в момент своего величайшего унижения."
        },
        {
            name: "Путешествие к Бессмертию: Секта Семи Тайн",
            prompt: "Родившись простолюдином, вам удалось поступить в Секту Семи Тайн, незначительный клан Цзянху, не как боевой мастер, а как неофициальный ученик по знакомству. Вам поручают чёрную работу и смотрят свысока. Ваши врождённые духовные корни слабы. В этом мире скрытых культиваторов и безжалостной политики у вас есть только ваш ум, крайняя осторожность и таинственная маленькая зелёная бутылочка, которую вы носите с детства.",
            loreSource: "Путешествие к Бессмертию",
            playerRole: "Молодой, ничем не примечательный ученик со слабым талантом, но осторожным умом, только что прибывший в Секту Семи Тайн."
        },
    ]
};

// --- Types ---
export type GameState = 'start' | 'loading' | 'translating' | 'playing';
type NarrationStatus = 'idle' | 'generating' | 'playing';
type DebugInfo = { apiCallCount: number, lastApiStatus: string, errors: string[], groundingChunks?: any[], gmInfo?: WorldState['gmInfo'] };
export type RecordingTarget = 'prompt' | 'action';

export const useGameLogic = () => {
    const [language, setLanguage] = useState<keyof typeof UI_STRINGS>('ru');
    const [selectedModel, setSelectedModel] = useState<AIModel>(AI_MODELS[0]);
    const [gameState, setGameState] = useState<GameState>('start');
    const [savedWorlds, setSavedWorlds] = useState<SavedWorldsMap>({});
    const [lastPlayedId, setLastPlayedId] = useState<string | null>(null);
    const [currentWorldId, setCurrentWorldId] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryEntry[]>([]);
    const [customAction, setCustomAction] = useState('');
    const [startScreenPrompt, setStartScreenPrompt] = useState('');
    const [isMuted, setIsMuted] = useState(true);
    const [narrationStatus, setNarrationStatus] = useState<NarrationStatus>('idle');
    const [detailedEntity, setDetailedEntity] = useState<Entity | null>(null);
    const [playerThought, setPlayerThought] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTarget, setRecordingTarget] = useState<RecordingTarget | null>(null);
    const [isDebugPanelOpen, setIsDebugPanelOpen] = useState(false);
    const [debugInfo, setDebugInfo] = useState<DebugInfo>({ apiCallCount: 0, lastApiStatus: 'Idle', errors: [], groundingChunks: [] });
    const [isDonghuaModeActive, setIsDonghuaModeActive] = useState(false);
    const [isAutoPlayPaused, setIsAutoPlayPaused] = useState(false);

    const [apiConfig, setApiConfig] = useState<APIConfig>({ ollamaHost: 'http://localhost:11434' });
    const [ollamaState, setOllamaState] = useState<{ loading: boolean; error: string | null }>({ loading: false, error: null });
    const [ollamaModels, setOllamaModels] = useState<AIModel[]>([]);

    const recognitionRef = useRef<SpeechRecognition | null>(null);
    const recordingTargetRef = useRef<RecordingTarget | null>(null);

    const t = UI_STRINGS[language];
    const currentHistoryEntry = history.length > 0 ? history[history.length - 1] : null;
    const worldState = currentHistoryEntry?.worldState;
    const actions = currentHistoryEntry?.actions || [];

    useEffect(() => { recordingTargetRef.current = recordingTarget; }, [recordingTarget]);

    const updateDebug = (updates: Partial<DebugInfo>) => setDebugInfo(prev => ({ ...prev, ...updates }));

    const loadWorldsFromDB = async () => {
        try {
            const worldsArray = await dbService.getAllWorlds();
            const worldsMap = worldsArray.reduce((acc: SavedWorldsMap, world) => { acc[world.id] = world; return acc; }, {});
            setSavedWorlds(worldsMap);
            setLastPlayedId(localStorage.getItem(LAST_PLAYED_ID_KEY));
        } catch (error) {
            console.error("Failed to load saved worlds from DB:", error);
            updateDebug({ errors: [...debugInfo.errors, `DB Load failed: Could not read saved worlds.`] });
        }
    };

    useEffect(() => { dbService.initDB().then(loadWorldsFromDB); }, []);

    // Update debug panel whenever history changes
    useEffect(() => {
        if (worldState) {
            updateDebug({ gmInfo: worldState.gmInfo });
        }
    }, [history]);

    useEffect(() => {
        const saveProgress = async () => {
            if (gameState === 'playing' && currentWorldId && history.length > 0) {
                const worldName = savedWorlds[currentWorldId]?.name || "Custom World";
                const worldToSave: SavedWorld = { id: currentWorldId, name: worldName, history };
                try {
                    await dbService.saveWorld(worldToSave);
                    localStorage.setItem(LAST_PLAYED_ID_KEY, currentWorldId);
                    setLastPlayedId(currentWorldId);
                    setSavedWorlds(prev => ({...prev, [currentWorldId]: worldToSave}));
                } catch (error) {
                    console.error("Failed to save progress to DB:", error);
                    updateDebug({ errors: [...debugInfo.errors, `Save failed: Could not write to IndexedDB.`] });
                }
            }
        };
        saveProgress();
    }, [history, currentWorldId]);
    
    useEffect(() => {
        const SpeechRecognition: SpeechRecognitionStatic | undefined = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (!SpeechRecognition) { console.warn("Speech Recognition not supported."); return; }
        const recognition: SpeechRecognition = new SpeechRecognition();
        recognition.continuous = isDonghuaModeActive;
        recognition.lang = language;
        recognition.interimResults = false;
        recognition.onresult = (event: SpeechRecognitionEvent) => {
            const transcript = event.results[event.resultIndex][0].transcript.trim();
            if (isDonghuaModeActive) {
                handleVoiceInterrupt(transcript);
            } else {
                const target = recordingTargetRef.current;
                if (target === 'action') {
                    setCustomAction(transcript);
                } else if (target === 'prompt') {
                    setStartScreenPrompt(prev => (prev ? prev + ' ' : '') + transcript);
                }
            }
        };
        recognition.onend = () => {
            if (isDonghuaModeActive) recognitionRef.current?.start();
            else { setIsRecording(false); setRecordingTarget(null); }
        };
        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
            // Gracefully handle "no-speech" which is expected if the user is just listening.
            if (event.error === 'no-speech') {
                return; // Not a fatal error, onend will handle restart if in Donghua mode.
            }

            // For all other errors, log them and update the debug panel.
            console.error("Speech recognition error", event.error);
            const errorMessage = `Speech Recognition: ${event.error}`;
            setDebugInfo(prev => ({ ...prev, errors: [...prev.errors, errorMessage] }));
            setIsRecording(false);
            setRecordingTarget(null);
        };
        recognitionRef.current = recognition;
    }, [language, isDonghuaModeActive]);

    useEffect(() => {
        let autoplayTimer: number;
        if (isDonghuaModeActive && !isAutoPlayPaused && gameState === 'playing' && narrationStatus === 'idle' && actions.length > 0) {
            autoplayTimer = window.setTimeout(() => handleAction(actions[0]), 3000);
        }
        return () => window.clearTimeout(autoplayTimer);
    }, [isDonghuaModeActive, isAutoPlayPaused, gameState, narrationStatus, history]);

    const fetchOllamaModels = async () => {
        if (!apiConfig.ollamaHost) {
            setOllamaState({ loading: false, error: "Ollama host is not set." });
            return;
        }
        setOllamaState({ loading: true, error: null });
        try {
            const response = await fetch(`${apiConfig.ollamaHost.replace(/\/+$/, '')}/api/tags`);
            if (!response.ok) {
                let errorBody;
                try { errorBody = await response.json(); } catch (e) { errorBody = await response.text(); }
                throw new Error(`[Ollama Error ${response.status}] ${errorBody.error || errorBody}`);
            }
            const data = await response.json();
            const models: AIModel[] = data.models.map((m: any) => ({
                id: m.name,
                name: m.name,
                provider: ModelProvider.Ollama
            }));
            setOllamaModels(models);
            setOllamaState({ loading: false, error: null });
            if (models.length > 0 && selectedModel.provider === ModelProvider.Ollama && selectedModel.id === 'unselected') {
                setSelectedModel(models[0]);
            }
        } catch (e: any) {
            const errorMessage = e.message || 'Failed to fetch models.';
            setOllamaState({ loading: false, error: errorMessage });
            setOllamaModels([]);
            updateDebug({ errors: [...debugInfo.errors, `Ollama Fetch: ${errorMessage}`] });
        }
    };

    const handleStartNewWorld = async (config: { name: string; prompt?: string; worldData?: SavedWorld; loreSource?: string; playerRole?: string; }) => {
        const { name, prompt, worldData, loreSource, playerRole } = config;
    
        if (worldData) {
            setGameState('loading');
            const newId = uuidv4();
            const newWorld: SavedWorld = { ...worldData, id: newId, name };
            
            try {
                await dbService.saveWorld(newWorld);
                setSavedWorlds(prev => ({ ...prev, [newId]: newWorld }));
                
                setCurrentWorldId(newId);
                setHistory(newWorld.history);
                
                const worldLang = newWorld.history[0]?.language as keyof typeof UI_STRINGS;
                if (worldLang && worldLang !== language) {
                    setLanguage(worldLang);
                }

                setGameState('playing');
                const lastChronicle = newWorld.history[newWorld.history.length - 1]?.chronicleEntry;
                await narrate(lastChronicle);
            } catch (error) {
                console.error("Failed to load preset world:", error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                updateDebug({ lastApiStatus: `Error: ${errorMessage}`, errors: [...debugInfo.errors, `Preset Load: ${errorMessage}`] });
                setGameState('start');
            }
    
        } else if (prompt) {
            if (!prompt.trim()) return;
            setGameState('loading');
            const logEvent = (message: string) => updateDebug({ lastApiStatus: message });
            updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: `Generating world for: "${prompt}"...`, groundingChunks: [], gmInfo: undefined });
            try {
                const { worldState, actions, groundingChunks } = await aiService.generateWorld(prompt, language, loreSource, playerRole, selectedModel, apiConfig, logEvent);
                if (prompt === startScreenPrompt) {
                    setStartScreenPrompt('');
                }
                const newId = uuidv4();
                const initialHistory: HistoryEntry[] = [{ worldState, actions, playerAction: t.worldCreated, chronicleEntry: worldState.description, language }];
                setHistory(initialHistory);
                setCurrentWorldId(newId);
                const newWorld: SavedWorld = { id: newId, name: loreSource || name, history: initialHistory };
                await dbService.saveWorld(newWorld);
                setSavedWorlds(prev => ({ ...prev, [newId]: newWorld }));
                updateDebug({ lastApiStatus: 'World generated successfully.', groundingChunks, gmInfo: worldState.gmInfo });
                setGameState('playing');
                await narrate(worldState.description);
            } catch (error) {
                console.error(error);
                const errorMessage = error instanceof Error ? error.message : String(error);
                updateDebug({ lastApiStatus: `Error: ${errorMessage}`, errors: [...debugInfo.errors, `World Gen: ${errorMessage}`] });
                setGameState('start');
            }
        }
    };

    const handleAction = async (action: PlayerAction) => {
        if (!worldState) return;
        setGameState('loading'); setPlayerThought(null);
        const logEvent = (message: string) => updateDebug({ lastApiStatus: message });
        try {
            updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: `Rephrasing action...`, groundingChunks: [] });
            const thought = await aiService.rephraseActionAsThought(action.description, language, selectedModel, apiConfig);
            setPlayerThought(thought);
            await narrate(thought);
            updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: `Processing action...` });
            const { worldState: newWorldState, actions: newActions, chronicle: chronicleEntry, groundingChunks } = await aiService.processAction(worldState, action.description, language, selectedModel, apiConfig, logEvent);
            setHistory(prev => [...prev, { worldState: newWorldState, actions: newActions, playerAction: action.description, chronicleEntry, language }]);
            setPlayerThought(null);
            updateDebug({ lastApiStatus: 'Action processed successfully.', groundingChunks, gmInfo: newWorldState.gmInfo });
            setGameState('playing');
            await narrate(chronicleEntry);
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            updateDebug({ lastApiStatus: `Error: ${errorMessage}`, errors: [...debugInfo.errors, `Process Action: ${errorMessage}`] });
            setGameState('playing');
        }
    };

    const handleRewind = (index: number) => setHistory(prev => prev.slice(0, index + 1));
    const handleReturnToStart = () => { setCurrentWorldId(null); setHistory([]); setGameState('start'); }

    const handleLanguageChange = async (newLang: keyof typeof UI_STRINGS) => {
        if (newLang === language || history.length === 0) { setLanguage(newLang); return; }
        setGameState('translating');
        updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: `Translating world to ${LANGUAGES[newLang]}...` });
        try {
            const textsToTranslate: string[] = [];
            history.forEach(entry => {
                // Player-facing text
                textsToTranslate.push(entry.worldState.description);
                entry.worldState.entities.forEach(e => { textsToTranslate.push(e.name); textsToTranslate.push(e.description); });
                entry.actions.forEach(a => textsToTranslate.push(a.description));
                textsToTranslate.push(entry.playerAction);
                textsToTranslate.push(entry.chronicleEntry);
                // GM-info text
                if (entry.worldState.gmInfo.goal) {
                    textsToTranslate.push(entry.worldState.gmInfo.goal.title);
                    entry.worldState.gmInfo.goal.steps.forEach(s => textsToTranslate.push(s.description));
                }
                entry.worldState.gmInfo.entities.forEach(e => { textsToTranslate.push(e.name); textsToTranslate.push(e.description); });
            });

            const translatedTexts = await aiService.translateBatch(textsToTranslate, newLang, selectedModel, apiConfig);
            let i = 0;
            const translatedHistory = history.map(entry => {
                const newEntry = JSON.parse(JSON.stringify(entry)) as HistoryEntry;
                // Translate player-facing
                newEntry.worldState.description = translatedTexts[i++];
                newEntry.worldState.entities.forEach((e: Entity) => { e.name = translatedTexts[i++]; e.description = translatedTexts[i++]; });
                newEntry.actions.forEach((a: PlayerAction) => { a.description = translatedTexts[i++]; });
                newEntry.playerAction = translatedTexts[i++];
                newEntry.chronicleEntry = translatedTexts[i++];
                // Translate GM-info
                if (newEntry.worldState.gmInfo.goal) {
                    newEntry.worldState.gmInfo.goal.title = translatedTexts[i++];
                    newEntry.worldState.gmInfo.goal.steps.forEach((s: GoalStep) => s.description = translatedTexts[i++]);
                }
                newEntry.worldState.gmInfo.entities.forEach((e: MasterEntity) => { e.name = translatedTexts[i++]; e.description = translatedTexts[i++]; });

                newEntry.language = newLang;
                return newEntry;
            });
            setHistory(translatedHistory);
            setLanguage(newLang);
            updateDebug({ lastApiStatus: 'Translation successful.' });
        } catch(error) {
            console.error("Failed to translate world history", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            updateDebug({ lastApiStatus: `Error: ${errorMessage}`, errors: [...debugInfo.errors, `Translation: ${errorMessage}`] });
            alert("Translation failed.");
        } finally {
            setGameState('playing');
        }
    };

    const handleLoadWorld = (worldId: string) => {
        const worldToLoad = savedWorlds[worldId];
        if (worldToLoad) {
            setCurrentWorldId(worldId);
            setHistory(worldToLoad.history);
            setGameState('playing');
            const worldLang = worldToLoad.history[0]?.language as keyof typeof UI_STRINGS;
            if (worldLang && worldLang !== language) setLanguage(worldLang);
        }
    };

    const handleContinueLastWorld = () => { if (lastPlayedId && savedWorlds[lastPlayedId]) handleLoadWorld(lastPlayedId); };

    const handleExport = async (jsonOnly = false) => {
        if (!currentWorldId) return;
        const worldToExport = savedWorlds[currentWorldId];
        if (!worldToExport) { console.error("Cannot export: world not found."); return; }
        
        const exportFileName = `${worldToExport.name.replace(/\s/g, '_')}`;

        if (jsonOnly) {
            const historyForJson = worldToExport.history.map(entry => ({...entry, worldState: {...entry.worldState, imageUrl: undefined}}));
            const content = JSON.stringify({ ...worldToExport, history: historyForJson }, null, 2);
            const blob = new Blob([content], { type: 'application/json' });
            const dataUri = URL.createObjectURL(blob);
            downloadFile(dataUri, `${exportFileName}.json`);
            URL.revokeObjectURL(dataUri);
            return;
        }

        const zip = new JSZip();
        const imgFolder = zip.folder("images");
        if (!imgFolder) return;
        const historyForJson = worldToExport.history.map((entry, index) => {
            const newEntry = { ...entry };
            if (entry.worldState.imageUrl?.startsWith('data:image')) {
                const fileExtension = entry.worldState.imageUrl.split(';')[0].split('/')[1] || 'png';
                const fileName = `step_${index}.${fileExtension}`;
                const base64Data = entry.worldState.imageUrl.split(',')[1];
                imgFolder.file(fileName, base64Data, { base64: true });
                newEntry.worldState = { ...newEntry.worldState, imageUrl: `images/${fileName}` };
            }
            return newEntry;
        });
        zip.file("world.json", JSON.stringify({ ...worldToExport, history: historyForJson }, null, 2));
        const content = await zip.generateAsync({ type: "blob" });
        const dataUri = URL.createObjectURL(content);
        downloadFile(dataUri, `${exportFileName}.zip`);
        URL.revokeObjectURL(dataUri);
    };

    const downloadFile = (dataUri: string, fileName: string) => {
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
    };

    const handleImport = async (file: File) => {
        if (!file) return;
        try {
            let importedWorldData: SavedWorld;
            if (file.name.endsWith('.zip')) {
                const content = await file.arrayBuffer();
                const zip = await JSZip.loadAsync(content);
                const worldFile = zip.file("world.json");
                if (!worldFile) throw new Error("world.json not found in archive.");
                const worldJson = await worldFile.async("string");
                importedWorldData = JSON.parse(worldJson) as SavedWorld;
                const imagePromises = importedWorldData.history.map(async (entry) => {
                    if (entry.worldState.imageUrl?.startsWith('images/')) {
                        const imageFile = zip.file(entry.worldState.imageUrl);
                        if (imageFile) {
                            const base64Data = await imageFile.async("base64");
                            const mimeType = `image/${entry.worldState.imageUrl.split('.').pop() || 'png'}`;
                            entry.worldState.imageUrl = `data:${mimeType};base64,${base64Data}`;
                        }
                    }
                    return entry;
                });
                importedWorldData.history = await Promise.all(imagePromises);
            } else if (file.name.endsWith('.json')) {
                const worldJson = await file.text();
                importedWorldData = JSON.parse(worldJson) as SavedWorld;
            } else {
                throw new Error("Unsupported file type. Please select a .zip or .json file.");
            }
            const newId = uuidv4();
            const finalWorld: SavedWorld = { ...importedWorldData, id: newId };
            await dbService.saveWorld(finalWorld);
            await loadWorldsFromDB();
            handleLoadWorld(newId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            alert(`Error reading or parsing the file: ${errorMessage}`);
            console.error(error);
        }
    };

    const handleCustomAction = async (directTranscript?: string) => {
        const actionText = directTranscript || customAction;
        if (!actionText.trim() || !worldState) return;
        setGameState('loading');
        updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: `Clarifying action...` });
        try {
            const clarifiedActions = await aiService.clarifyAction(worldState, actionText, language, selectedModel, apiConfig);
            setHistory(prev => [...prev, { ...prev[prev.length - 1], actions: clarifiedActions, playerAction: `${t.playerActionPrefix}${actionText}`, chronicleEntry: t.playerActionThinking(actionText), language }]);
            setCustomAction('');
            updateDebug({ lastApiStatus: 'Custom action clarified.' });
            setGameState('playing');
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            updateDebug({ lastApiStatus: `Error: ${errorMessage}`, errors: [...debugInfo.errors, `Clarify Action: ${errorMessage}`] });
            setGameState('playing');
        } finally {
            if (directTranscript) setIsAutoPlayPaused(false);
        }
    };
    
    const handleVoiceInterrupt = (transcript: string) => {
        if (!transcript || !worldState) return;
        setIsAutoPlayPaused(true);
        setCustomAction(transcript);
        handleCustomAction(transcript);
    };

    const handleDetailEntity = async (entity: Entity) => {
        if (!worldState) return;
        setDetailedEntity(entity);
        updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: `Detailing entity...` });
        const detailed = await aiService.detailEntity(entity, worldState.description, language, selectedModel, apiConfig);
        setDetailedEntity(detailed);
        updateDebug({ lastApiStatus: 'Entity detailed.' });
        await narrate(detailed.description);
    }
    
    const narrate = async (text: string) => {
        if (isMuted || narrationStatus !== 'idle' || !text) return;
        try {
            setNarrationStatus('generating');
            updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: 'Generating audio...' });
            const audio = await aiService.textToSpeech(text, apiConfig);
            setNarrationStatus('playing');
            updateDebug({ lastApiStatus: 'Playing audio...' });
            await playBase64Audio(audio);
        } catch (error) {
            console.error("Narration failed", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            updateDebug({ lastApiStatus: `Error: ${errorMessage}`, errors: [...debugInfo.errors, `TTS: ${errorMessage}`] });
        } finally {
            setNarrationStatus('idle');
            updateDebug({ lastApiStatus: 'Idle' });
        }
    };

    const handleToggleRecording = (target: RecordingTarget) => {
        if (!recognitionRef.current) return;
        if (isRecording) recognitionRef.current.stop();
        else { setRecordingTarget(target); setIsRecording(true); recognitionRef.current.start(); }
    };

    const toggleDonghuaMode = () => {
        const nextState = !isDonghuaModeActive;
        setIsDonghuaModeActive(nextState);
        if (nextState) { setIsMuted(false); recognitionRef.current?.start(); }
        else recognitionRef.current?.stop();
    };
    
    const handleRegenerateImage = async (historyIndex: number) => {
        const entry = history[historyIndex];
        if (!entry) return;
        
        const originalImageUrl = entry.worldState.imageUrl;
        // Optimistically update UI to show loading state
        const updatedHistory = [...history];
        updatedHistory[historyIndex].worldState.imageUrl = 'loading';
        setHistory(updatedHistory);

        updateDebug({ apiCallCount: debugInfo.apiCallCount + 1, lastApiStatus: `Regenerating image for step ${historyIndex}...` });
        try {
            const newImageUrl = await aiService.regenerateImage(entry.worldState.description, entry.chronicleEntry, apiConfig);
            const finalHistory = [...history];
            finalHistory[historyIndex].worldState.imageUrl = newImageUrl;
            setHistory(finalHistory);
            updateDebug({ lastApiStatus: 'Image regenerated.' });
        } catch (error) {
            console.error("Image regeneration failed", error);
            const errorMessage = error instanceof Error ? error.message : String(error);
            updateDebug({ lastApiStatus: `Error: ${errorMessage}`, errors: [...debugInfo.errors, `Image Regen: ${errorMessage}`] });
            // Revert on failure
            const revertedHistory = [...history];
            revertedHistory[historyIndex].worldState.imageUrl = originalImageUrl;
            setHistory(revertedHistory);
        }
    };
    
    const handleModelChange = (model: AIModel) => {
        setSelectedModel(model);
    };

    return {
        gameState, language, t, worldState, savedWorlds, lastPlayedId, history, actions, customAction, setCustomAction,
        startScreenPrompt, setStartScreenPrompt,
        playerThought, isMuted, setIsMuted, narrationStatus, isDonghuaModeActive, isDebugPanelOpen, setIsDebugPanelOpen,
        debugInfo, isRecording, recordingTarget, selectedModel,
        handleLanguageChange, handleStartNewWorld, handleLoadWorld, handleContinueLastWorld, handleImport,
        handleReturnToStart, handleAction, handleCustomAction, handleRewind, handleDetailEntity, handleExport,
        handleToggleRecording, toggleDonghuaMode, detailedEntity, setDetailedEntity, handleRegenerateImage, handleModelChange,
        apiConfig, setApiConfig, ollamaState, ollamaModels, fetchOllamaModels,
    };
};