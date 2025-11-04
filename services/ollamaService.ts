// services/ollamaService.ts
import { v4 as uuidv4 } from 'uuid';
import { aiService } from './aiService';
import { searchService } from './searchService';
import type { WorldState, PlayerAction, Entity, GMInfo, MasterEntity, APIConfig, GeminiSchema } from '../types';
import { getSchemas } from './geminiService';

const OLLAMA_TIMEOUT = 600000; // 10 minutes

const fetchWithTimeout = async (url: string, options: RequestInit, timeout: number): Promise<Response> => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
    } catch (e: any) {
        clearTimeout(id);
        if (e.name === 'AbortError') {
            throw new Error(`Request to Ollama timed out after ${timeout / 1000}s.`);
        }
        throw e;
    }
};

const handleAPIError = async (response: Response, host: string) => {
    let errorBody;
    try { errorBody = await response.json(); }
    catch (e) { errorBody = await response.text(); }
    console.error('Error from Ollama API:', response.status, errorBody);
    const message = `[Ollama Error ${response.status}] ${errorBody.error || errorBody}`;
    throw new Error(message);
};

// Generic function to get a JSON response by instructing the model
async function getJsonResponse(prompt: string, modelId: string, apiConfig: APIConfig, schema: any) {
    const { ollamaHost } = apiConfig;
    if (!ollamaHost) throw new Error("Ollama Host URL is not configured.");

    const body = {
        model: modelId,
        prompt: prompt,
        stream: false,
        format: 'json',
        options: { temperature: 0.2, top_p: 0.9, num_predict: 4096 }
    };

    const response = await fetchWithTimeout(
        `${ollamaHost.replace(/\/+$/, '')}/api/generate`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) },
        OLLAMA_TIMEOUT
    );

    if (!response.ok) await handleAPIError(response, ollamaHost);
    
    const data = await response.json();
    try {
        // Ollama's response is a stringified JSON within a JSON object.
        return JSON.parse(data.response);
    } catch (e) {
        console.error("Failed to parse JSON from Ollama response string:", data.response);
        throw new Error("Ollama model returned invalid JSON.");
    }
}

const generateWorld = async (
    prompt: string,
    language: string,
    loreSource: string | undefined,
    playerRole: string | undefined,
    model: string,
    apiConfig: APIConfig,
    logEvent: (message: string) => void
): Promise<{ worldState: WorldState, actions: PlayerAction[], imageUrl: string, groundingChunks?: any[] }> => {
    const schemas = getSchemas();
    const lores = loreSource ? loreSource.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    let contextFromSearch = '';
    if (lores.length > 0) {
        const searchQueries = lores.map(l => `lore summary for ${l}`);
        const searchResults = await searchService.searchWeb(searchQueries.join('; '), logEvent, 3);
        if (searchResults.length > 0) {
            contextFromSearch = 'ADDITIONAL CONTEXT FROM WEB SEARCH:\n' + searchResults.map(r => `Title: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
        }
    }

    const canonDefinition = lores.length > 0 ? `based on the worlds of ${lores.join(' and ')}` : 'based on the user prompt';
    const playerRoleDef = playerRole ? `The player's role is: "${playerRole}".` : '';

    const worldGenPrompt = `You are a Game Master creating a world ${canonDefinition}. ${playerRoleDef} The starting scenario is: "${prompt}".
${contextFromSearch}
Your task is to generate a JSON object representing the initial world state. Adhere strictly to this JSON schema: ${JSON.stringify(schemas.createLoreBasedWorldTool.parameters)}
Respond in ${language}.`;

    const args = await getJsonResponse(worldGenPrompt, model, apiConfig, schemas.createLoreBasedWorldTool.parameters);
    
    // Process the JSON response similarly to Gemini
    const worldDescriptionForImage = args.playerDescription as string;
    const gmInfo = args.gmInfo as GMInfo;
    const gmEntities: MasterEntity[] = (gmInfo.entities || []).map((e: any) => ({
        id: `${e.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 4)}`, ...e
    }));
    gmInfo.entities = gmEntities;

    const worldState: WorldState = {
        description: args.playerDescription,
        entities: (args.playerEntities || []).map((e: any) => {
            const masterEntity = gmEntities.find(me => me.name === e.name);
            return { id: masterEntity ? masterEntity.id : uuidv4(), name: e.name, description: e.description };
        }),
        loreSource, playerRole, gmInfo
    };

    const actions: PlayerAction[] = (args.playerActions || []).map((desc: string) => ({
        id: `${desc.toLowerCase().replace(/\s+/g, '-').substring(0, 20)}-${uuidv4().substring(0, 4)}`, description: desc
    }));

    // Local LLMs can't generate images, so we use a placeholder.
    const imageUrl = `https://picsum.photos/1024/768?random=${Date.now()}`;
    worldState.imageUrl = imageUrl;
    
    return { worldState, actions, imageUrl };
};

const processAction = async (currentWorldState: WorldState, actionDescription: string, language: string, model: string, apiConfig: APIConfig, logEvent: (message: string) => void): Promise<{ worldState: WorldState, actions: PlayerAction[], chronicle: string, imageUrl: string, groundingChunks?: any[] }> => {
    const schemas = getSchemas();
    const { loreSource, playerRole } = currentWorldState;
    const lores = loreSource ? loreSource.split(',').map(s => s.trim()).filter(Boolean) : [];
    
    let contextFromSearch = '';
    if (lores.length > 0) {
        // Perform a targeted search based on the action
        const searchResults = await searchService.searchWeb(`${lores.join(' ')} ${actionDescription}`, logEvent, 2);
        if (searchResults.length > 0) {
            contextFromSearch = 'CONTEXT FROM WEB SEARCH:\n' + searchResults.map(r => `Title: ${r.title}\nSnippet: ${r.snippet}`).join('\n\n');
        }
    }
    
    const prompt = `You are a Game Master. The current world state is: ${JSON.stringify(currentWorldState)}. The player performs the action: "${actionDescription}".
${contextFromSearch}
Update the world state. Your response must be a JSON object adhering to this schema: ${JSON.stringify(schemas.updateLoreBasedWorldTool.parameters)}. Respond in ${language}.`;

    const args = await getJsonResponse(prompt, model, apiConfig, schemas.updateLoreBasedWorldTool.parameters);
    
    const chronicle = args.chronicleEntry as string;
    const gmInfo = args.updatedGmInfo as GMInfo;
    const gmEntities: MasterEntity[] = (gmInfo.entities || []).map((e: any) => ({
        id: `${e.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 4)}`, ...e
    }));
    gmInfo.entities = gmEntities;

    const newWorldState: WorldState = {
        ...currentWorldState,
        description: args.newPlayerDescription,
        entities: (args.playerEntities || []).map((e: any) => {
            const masterEntity = gmEntities.find(me => me.name === e.name);
            return { id: masterEntity ? masterEntity.id : uuidv4(), name: e.name, description: e.description };
        }),
        gmInfo
    };

    const newActions: PlayerAction[] = (args.playerActions || []).map((desc: string) => ({
        id: `${desc.toLowerCase().replace(/\s+/g, '-').substring(0, 20)}-${uuidv4().substring(0, 4)}`, description: desc
    }));
    
    const imageUrl = `https://picsum.photos/1024/768?random=${Date.now()}`;
    newWorldState.imageUrl = imageUrl;

    return { worldState: newWorldState, actions: newActions, chronicle, imageUrl };
};

const clarifyAction = async (currentWorldState: WorldState, customAction: string, language: string, model: string, apiConfig: APIConfig): Promise<PlayerAction[]> => {
    const schemas = getSchemas();
    const prompt = `Player intent: "${customAction}". Current scene: "${currentWorldState.description}".
Generate a list of 3-5 concrete actions. Your response must be a JSON object adhering to this schema: ${JSON.stringify(schemas.actionsSchema)}. Respond in ${language}.`;
    
    const actionData = await getJsonResponse(prompt, model, apiConfig, schemas.actionsSchema);
    return (actionData.suggested_actions || []).map((a: any) => ({ ...a, id: a.id || uuidv4() }));
};

export const ollamaService = {
    generateWorld,
    processAction,
    clarifyAction,
};
