import { GoogleGenAI, Modality, Type, FunctionDeclaration } from "@google/genai";
import { v4 as uuidv4 } from 'uuid';
import type { WorldState, PlayerAction, Entity, Goal, MasterEntity, GMInfo, GeminiSchema } from '../types';

const getAiClient = (apiKey?: string) => {
    if (!apiKey) {
        throw new Error("Google AI API Key not provided. Please add it in the settings.");
    }
    return new GoogleGenAI({ apiKey });
};


// --- Narrative Vector Engine Tools ---

const gmInfoSchema = {
    type: Type.OBJECT,
    description: "The complete hidden state of the world for the Game Master. This is your internal memory and simulation model.",
    properties: {
        goal: {
            type: Type.OBJECT,
            description: "The player's immediate, short-term goal or quest, designed to guide them toward the next canonical event.",
            properties: {
                title: { type: Type.STRING },
                steps: {
                    type: Type.ARRAY, items: {
                        type: Type.OBJECT, properties: {
                            id: { type: Type.STRING },
                            description: { type: Type.STRING },
                            completed: { type: Type.BOOLEAN }
                        }, required: ['id', 'description', 'completed']
                    }
                }
            }, required: ['title', 'steps']
        },
        entities: {
            type: Type.ARRAY,
            description: "The complete list of all entities in the current scene and their hidden states (e.g., 'hostile', 'secretly holds the key').",
            items: {
                type: Type.OBJECT, properties: {
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    state: { type: Type.STRING }
                }, required: ['name', 'description', 'state']
            }
        },
        worldSummary: { type: Type.STRING, description: "Your high-level summary of the state of the *entire* world, including key characters and events happening off-screen. This is your persistent memory." },
        nextCanonicalEvent: { type: Type.STRING, description: "A description of the next major plot point from the source material that the story is currently heading towards." },
        deviationAnalysis: { type: Type.STRING, description: "Your analysis of how the last player action affected the canon. For world creation, this should state that the timeline is starting at a canonical point." },
    },
    required: ['goal', 'entities', 'worldSummary', 'nextCanonicalEvent', 'deviationAnalysis']
};


const createLoreBasedWorldTool: FunctionDeclaration = {
    name: 'createLoreBasedWorld',
    description: "Creates the entire initial world state, separating player-visible info from the comprehensive, hidden Game Master world model.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            playerDescription: { type: Type.STRING, description: "A vivid, atmospheric description of the scene for the player to read." },
            playerEntities: {
                type: Type.ARRAY,
                description: "A list of objects or characters the player can immediately see. Do NOT include hidden states.",
                items: {
                    type: Type.OBJECT, properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING }
                    }, required: ['name', 'description']
                }
            },
            playerActions: {
                type: Type.ARRAY,
                description: "A list of 3-5 suggested actions for the player that align with the canonical story path.",
                items: { type: Type.STRING }
            },
            gmInfo: gmInfoSchema
        },
        required: ['playerDescription', 'playerEntities', 'playerActions', 'gmInfo']
    }
};

const updateLoreBasedWorldTool: FunctionDeclaration = {
    name: 'updateLoreBasedWorld',
    description: 'Updates the world state after a player action, generating the player-visible outcome and updating the hidden GM world model.',
    parameters: {
        type: Type.OBJECT,
        properties: {
            newPlayerDescription: { type: Type.STRING, description: "The new description of the scene for the player." },
            chronicleEntry: { type: Type.STRING, description: "A narrative summary of what just happened for the player to read." },
            playerEntities: {
                type: Type.ARRAY,
                description: "The new list of entities visible to the player. This REPLACES the old list.",
                items: {
                    type: Type.OBJECT, properties: {
                        name: { type: Type.STRING },
                        description: { type: Type.STRING }
                    }, required: ['name', 'description']
                }
            },
            playerActions: {
                 type: Type.ARRAY,
                description: "A list of 3-5 new suggested actions for the player. This REPLACES the old list.",
                items: { type: Type.STRING }
            },
            updatedGmInfo: gmInfoSchema,
            timeSkipSummary: { type: Type.STRING, description: "Optional: A narrative summary of a time skip if the plot needs to jump forward to align with canon." }
        },
        required: ['newPlayerDescription', 'chronicleEntry', 'playerEntities', 'playerActions', 'updatedGmInfo']
    },
};

const actionsSchema = {
    type: Type.OBJECT,
    properties: {
        suggested_actions: {
            type: Type.ARRAY,
            description: "A list of 3-5 logical and contextually relevant actions the player can take next based on their custom input. If the input is impossible, provide actions that lead the player back to plausible activities.",
            items: {
                type: Type.OBJECT,
                properties: {
                    id: { type: Type.STRING, description: "A unique identifier for the action (e.g., 'examine-tree')." },
                    description: { type: Type.STRING, description: "A short, actionable description of what the player can do (e.g., 'Examine the ancient tree')." }
                },
                required: ['id', 'description']
            }
        }
    },
    required: ['suggested_actions']
};

export const getSchemas = (): GeminiSchema => ({
    createLoreBasedWorldTool,
    updateLoreBasedWorldTool,
    actionsSchema,
    gmInfoSchema,
});


const generateWorld = async (prompt: string, language: string = 'en', loreSource?: string, playerRole?: string, model: string = 'gemini-2.5-pro', apiKey?: string): Promise<{ worldState: WorldState, actions: PlayerAction[], imageUrl: string, groundingChunks?: any[] }> => {
    try {
        const ai = getAiClient(apiKey);
        let worldState: WorldState;
        let actions: PlayerAction[];
        let groundingChunks: any[] = [];
        let worldDescriptionForImage: string;

        const lores = loreSource ? loreSource.split(',').map(s => s.trim()).filter(Boolean) : [];
        const worldGenTools = [{ functionDeclarations: [createLoreBasedWorldTool] }];
        const toolsConfig = lores.length > 0 ? [{googleSearch: {}}, ...worldGenTools] : worldGenTools;
        
        let canonDefinition: string;
        if (lores.length > 1) {
            canonDefinition = `You are the Game Master for a 'Narrative Vector Engine', designed to simulate a crossover universe blending the worlds of ${lores.map(l => `"${l}"`).join(' and ')}. Your primary directive is to create a living world that coherently merges the canons of these source materials while reacting dynamically to the player's choices. Perform comprehensive searches to build a mental model of the timelines for ${lores.map(l => `"${l}"`).join(' and ')}. This is your 'source of truth'.`;
        } else if (lores.length === 1) {
            canonDefinition = `You are the Game Master for a 'Narrative Vector Engine', designed to simulate the universe of "${lores[0]}". Your primary directive is to create a living world that adheres to the canon of the source material while reacting dynamically to the player's choices. Perform a comprehensive search to build a mental model of the "${lores[0]}" timeline. This is your 'source of truth'.`;
        } else {
            canonDefinition = `You are the Game Master for a 'Narrative Vector Engine'. Your primary directive is to create a completely new and original living world based *solely* on the user's starting prompt. This prompt is the foundational "canon" for this new universe. Extrapolate the rules, themes, and key elements from it to build your mental model.`;
        }

        const playerRoleDefinition = playerRole
            ? `- **Player's Role:** "${playerRole}"`
            : `- **Player's Role:** The implied protagonist of the scenario.`;

        const worldGenContents = `${canonDefinition}

**Initialize the World State.**
The player is entering the story at this point:
${playerRoleDefinition}
- **Starting Scenario:** "${prompt}"

Based on the canon you've established, create the initial world state.
- **Player-Facing:** Describe the scene vividly. List what the player can see. Suggest starting actions that align with the story path.
- **Game Master Info (Your Internal State):**
  - **worldSummary:** Summarize the state of the *entire world* at this precise moment.
  - **nextCanonicalEvent:** What is the next major story event that should happen?
  - **deviationAnalysis:** State: "Timeline initiated at a canonical starting point."
  - **goal:** Create a short-term goal for the player that moves them towards the next event.
  - **entities:** List ALL entities in the scene, including their hidden states.

Call the 'createLoreBasedWorld' function ONCE with all this information. Respond in ${language}.`;

        const worldGenResponse = await ai.models.generateContent({
            model: model,
            contents: worldGenContents,
            config: { tools: toolsConfig }
        });

        groundingChunks = worldGenResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

        const functionCall = worldGenResponse.functionCalls?.[0];
        if (!functionCall || functionCall.name !== 'createLoreBasedWorld') {
            console.error("Model response:", worldGenResponse.text);
            throw new Error("The model failed to generate world data using the 'createLoreBasedWorld' tool.");
        }
        
        const args = functionCall.args;
        worldDescriptionForImage = args.playerDescription as string;
        const gmInfo = args.gmInfo as GMInfo;

        const gmEntities: MasterEntity[] = gmInfo.entities.map((e: any) => ({
            id: `${e.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 4)}`,
            ...e
        }));
        
        gmInfo.entities = gmEntities; // Assign IDs back to the main object

        worldState = {
            description: args.playerDescription as string,
            entities: (args.playerEntities as any[]).map((e: any) => {
                const masterEntity = gmEntities.find(me => me.name === e.name);
                return {
                    id: masterEntity ? masterEntity.id : `${e.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 4)}`,
                    name: e.name, description: e.description
                };
            }),
            loreSource: loreSource,
            playerRole: playerRole,
            gmInfo: gmInfo
        };

        actions = (args.playerActions as string[]).map((desc: string) => ({
            id: `${desc.toLowerCase().replace(/\s+/g, '-').substring(0, 20)}-${uuidv4().substring(0, 4)}`,
            description: desc
        }));
        
        let imageGenPrompt: string;
        if (lores.length > 1) {
            imageGenPrompt = `Generate a beautiful, atmospheric image with an artistic style that merges the aesthetics of ${lores.map(l => `"${l}"`).join(' and ')}. The scene is: ${worldDescriptionForImage}`;
        } else if (lores.length === 1) {
            imageGenPrompt = `Generate a beautiful, atmospheric image in the distinct artistic style of the anime/donghua "${lores[0]}". The scene is: ${worldDescriptionForImage}`;
        } else {
            imageGenPrompt = `Analyze the following prompt and generate a beautiful, atmospheric image in a fitting artistic style (e.g., 'light novel anime style', 'mystical donghua style', 'dark fantasy oil painting'). Prompt: "${prompt}"`;
        }

        const imageGenResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imageGenPrompt }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
        
        let imageUrl = 'https://picsum.photos/1024/768';
        if (imageGenResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            const base64ImageBytes = imageGenResponse.candidates[0].content.parts[0].inlineData.data;
            imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        }
        
        worldState.imageUrl = imageUrl;

        return { worldState, actions, imageUrl, groundingChunks };

    } catch (error) {
        console.error("Error generating world:", error);
        throw new Error("Failed to generate the initial world state.");
    }
};

const processAction = async (currentWorldState: WorldState, actionDescription: string, language: string = 'en', model: string = 'gemini-2.5-pro', apiKey?: string): Promise<{ worldState: WorldState, actions: PlayerAction[], chronicle: string, imageUrl: string, groundingChunks?: any[] }> => {
    try {
        const ai = getAiClient(apiKey);
        let newWorldState: WorldState;
        let newActions: PlayerAction[];
        let chronicle: string;
        let groundingChunks: any[] = [];
        const { loreSource, playerRole } = currentWorldState;
        
        const lores = loreSource ? loreSource.split(',').map(s => s.trim()).filter(Boolean) : [];
        const actionProcessingTools = { functionDeclarations: [updateLoreBasedWorldTool] };
        const toolsConfig = lores.length > 0 ? [{googleSearch: {}}, actionProcessingTools] : [actionProcessingTools];

        let canonPreamble: string;
        if (lores.length > 1) {
            canonPreamble = `simulating a crossover universe of ${lores.map(l => `"${l}"`).join(' and ')} based on its established merged canon.`;
        } else if (lores.length === 1) {
            canonPreamble = `simulating the universe of "${lores[0]}".`;
        } else {
            canonPreamble = `simulating an original universe based on its established canon.`;
        }
            
        const prompt = `You are the GM of a 'Narrative Vector Engine' ${canonPreamble} A player action has occurred. Your task is to process it through your internal monologue, update the world state, and generate a response.

**--- Current World State (Your Memory) ---**
- **Player's Role:** "${playerRole || 'The Protagonist'}"
- **Current Scene:** ${JSON.stringify(currentWorldState.description)}
- **GM World Summary:** ${JSON.stringify(currentWorldState.gmInfo.worldSummary)}
- **Next Canonical Event:** ${JSON.stringify(currentWorldState.gmInfo.nextCanonicalEvent)}
- **GM Entities State:** ${JSON.stringify(currentWorldState.gmInfo.entities)}

**--- Player's Action ---**
- "${actionDescription}"

**--- YOUR INTERNAL MONOLOGUE (Perform these steps before generating the result) ---**
1.  **Analyze Action & Compare to Canon:** Does this action align with, deviate slightly from, or completely contradict the path to the 'Next Canonical Event'?
2.  **Apply Narrative Inertia:** Key canonical events have strong "gravity". If the deviation is minor, how does the world subtly guide events back towards the main path? Does a coincidence happen? Does another character intervene? If the deviation is major, acknowledge that a new timeline might be forming.
3.  **Simulate World Update:** How does this action affect the 'GM World Summary'? Does a main character's progress change? Does an enemy organization take notice? Update the summary.
4.  **Determine New 'Next Event':** Has the 'Next Canonical Event' been reached, altered, or delayed? Define the new 'Next Canonical Event'.
5.  **Formulate Deviation Analysis:** Briefly explain your reasoning for the outcome. Why did the world react this way?

**--- GENERATE RESPONSE ---**
Based on your monologue, update the entire world state.
- **Player-Facing:** Write a compelling narrative of the outcome. Describe the new scene. Provide new, logical actions for the player.
- **Game Master Info:** Update ALL fields of your hidden GM info (worldSummary, nextCanonicalEvent, goal, entities, and your new deviationAnalysis).

Call the 'updateLoreBasedWorld' function ONCE with the complete new state. All text must be in ${language}.`;

        const worldGenResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { tools: toolsConfig }
        });

        groundingChunks = worldGenResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        
        const functionCall = worldGenResponse.functionCalls?.[0];
        if (!functionCall || functionCall.name !== 'updateLoreBasedWorld') {
             console.error("Model response:", worldGenResponse.text);
            throw new Error("The model failed to update the world state using the 'updateLoreBasedWorld' tool.");
        }

        const args = functionCall.args;
        chronicle = args.chronicleEntry as string;
        const timeSkipSummary = args.timeSkipSummary as string | undefined;
        if (timeSkipSummary) {
            chronicle = `${timeSkipSummary}\n\n${chronicle}`;
        }
        
        const gmInfo = args.updatedGmInfo as GMInfo;
        const gmEntities: MasterEntity[] = gmInfo.entities.map((e: any) => ({
            id: `${e.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 4)}`,
            ...e
        }));
        gmInfo.entities = gmEntities;


        newWorldState = { 
            ...currentWorldState, 
            description: args.newPlayerDescription as string,
            entities: (args.playerEntities as any[]).map((e: any) => {
                 const masterEntity = gmEntities.find(me => me.name === e.name);
                return {
                    id: masterEntity ? masterEntity.id : `${e.name.toLowerCase().replace(/\s+/g, '-')}-${uuidv4().substring(0, 4)}`,
                    name: e.name, description: e.description
                };
            }),
            gmInfo: gmInfo
        }; 
        
        newActions = (args.playerActions as string[]).map((desc: string) => ({
            id: `${desc.toLowerCase().replace(/\s+/g, '-').substring(0, 20)}-${uuidv4().substring(0, 4)}`,
            description: desc
        }));

        let imageGenPrompt: string;
        if (lores.length > 1) {
            imageGenPrompt = `Generate a beautiful, atmospheric image with an artistic style that merges the aesthetics of ${lores.map(l => `"${l}"`).join(' and ')}. The scene is: ${newWorldState.description}. The outcome of the action was: ${chronicle}`;
        } else if (lores.length === 1) {
            imageGenPrompt = `Generate a beautiful, atmospheric image in the distinct artistic style of the anime/donghua "${lores[0]}". The scene is: ${newWorldState.description}`;
        } else {
            imageGenPrompt = `Generate a beautiful, atmospheric image in an artistic style that fits the scene. The scene is: ${newWorldState.description}. The outcome of the action was: ${chronicle}`;
        }

        const imageGenResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: imageGenPrompt }] },
            config: { responseModalities: [Modality.IMAGE] }
        });
       
        let imageUrl = currentWorldState.imageUrl;
        if (imageGenResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            const base64ImageBytes = imageGenResponse.candidates[0].content.parts[0].inlineData.data;
            imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        }
        newWorldState.imageUrl = imageUrl;

        return { worldState: newWorldState, actions: newActions, chronicle, imageUrl, groundingChunks };

    } catch (error) {
        console.error("Error processing action:", error);
        throw new Error("Failed to process the player's action.");
    }
};

const detailEntity = async (entity: Entity, worldDescription: string, language: string = 'en', apiKey?: string): Promise<Entity> => {
    try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `The player is showing interest in an entity. Generate a more detailed description of it, including its magical properties, alchemical potential, or history. Keep the response concise and evocative.
            World Context: "${worldDescription}"
            Entity Name: "${entity.name}"
            Current Description: "${entity.description}"
            Respond in ${language} with just the new, detailed description as a single string.`,
        });

        const detailedDescription = response.text;
        return { ...entity, description: detailedDescription };
    } catch (error) {
        console.error("Error detailing entity:", error);
        return entity; // Return original entity on error
    }
}

const clarifyAction = async (currentWorldState: WorldState, customAction: string, language: string = 'en', model: string = 'gemini-2.5-pro', apiKey?: string): Promise<PlayerAction[]> => {
    try {
        const ai = getAiClient(apiKey);
        const prompt = `The player wants to perform a custom action. As the Game Master, interpret their intent and provide a list of concrete, possible actions within the rules of this magical world.
        Current Scene: "${currentWorldState.description}"
        Player's Intent: "${customAction}"

        Analyze the intent. If it's plausible, break it down into one or more actionable steps. If it's impossible (e.g., 'fly to the moon'), offer related, but possible, actions (e.g., 'Look up at the twin moons', 'Search for texts about celestial travel'). Provide 3-5 suggestions. Respond in ${language}.`;

        const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: actionsSchema,
            }
        });
        
        const actionData = JSON.parse(response.text.trim());
        return actionData.suggested_actions || [];

    } catch (error) {
        console.error("Error clarifying action:", error);
        throw new Error("Failed to clarify the player's action.");
    }
};

const rephraseActionAsThought = async (action: string, language: string = 'en', apiKey?: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Rephrase the following player action as a brief, first-person inner thought of a character in a Donghua (Chinese animation). The character is about to perform this action. Respond in ${language}. IMPORTANT: Your response must contain ONLY the rephrased thought and nothing else. Do not add any introductory text, numbering, or offer multiple options. Action: "${action}"`,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error rephrasing action as thought:", error);
        return action; // Fallback to original action
    }
};

const textToSpeech = async (text: string, apiKey?: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash-preview-tts",
            contents: [{ parts: [{ text }] }],
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: 'Kore' }, // Note: voice may not support all languages equally well
                    },
                },
            },
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) {
            throw new Error("No audio data returned from API.");
        }
        return base64Audio;
    } catch (error) {
        console.error("Error with Text-to-Speech:", error);
        throw new Error("Failed to generate audio.");
    }
}

const translateBatch = async (texts: string[], targetLanguage: string, apiKey?: string): Promise<string[]> => {
    if (!texts || texts.length === 0) return [];
    try {
        const ai = getAiClient(apiKey);
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Translate the following JSON array of strings to ${targetLanguage}. Maintain the exact JSON array structure and order in your response. Respond ONLY with the translated JSON array.\n\n${JSON.stringify(texts)}`,
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                }
            }
        });
        const translatedTexts = JSON.parse(response.text.trim());
        if (translatedTexts.length !== texts.length) {
            throw new Error("Translation returned a different number of items.");
        }
        return translatedTexts;
    } catch (error) {
        console.error("Error translating batch:", error);
        return texts; // Fallback to original texts on error
    }
};

const regenerateImage = async (worldDescription: string, chronicleEntry: string, apiKey?: string): Promise<string> => {
    try {
        const ai = getAiClient(apiKey);
        const imageGenResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: [{ text: `Generate a beautiful, atmospheric image in an artistic style that fits the scene. The scene is: ${worldDescription}. The last thing that happened was: ${chronicleEntry}` }] },
            config: {
                responseModalities: [Modality.IMAGE],
            }
        });
        if (imageGenResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data) {
            const base64ImageBytes = imageGenResponse.candidates[0].content.parts[0].inlineData.data;
            return `data:image/png;base64,${base64ImageBytes}`;
        }
        throw new Error("No image data returned from API.");
    } catch (error) {
        console.error("Error regenerating image:", error);
        throw new Error("Failed to regenerate image.");
    }
};


export const geminiService = {
    generateWorld,
    processAction,
    detailEntity,
    textToSpeech,
    clarifyAction,
    rephraseActionAsThought,
    translateBatch,
    regenerateImage,
};

// Helper for TTS audio playback
export const playBase64Audio = (base64: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        try {
            const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
        
            const decode = (b64: string) => {
                const binaryString = atob(b64);
                const len = binaryString.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                return bytes;
            }

            const decodeAudioData = async (
                data: Uint8Array,
                ctx: AudioContext,
                sampleRate: number,
                numChannels: number,
            ): Promise<AudioBuffer> => {
                const dataInt16 = new Int16Array(data.buffer);
                const frameCount = dataInt16.length / numChannels;
                const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

                for (let channel = 0; channel < numChannels; channel++) {
                    const channelData = buffer.getChannelData(channel);
                    for (let i = 0; i < frameCount; i++) {
                        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
                    }
                }
                return buffer;
            }

            const audioBuffer = await decodeAudioData(
                decode(base64),
                outputAudioContext,
                24000,
                1,
            );

            const source = outputAudioContext.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(outputAudioContext.destination);
            source.onended = () => resolve();
            source.start();
        } catch (error) {
            reject(error);
        }
    });
};
