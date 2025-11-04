// services/aiService.ts
import type { APIConfig, AIModel, WorldState, PlayerAction, Entity } from '../types';
import { ModelProvider } from '../types';

import { geminiService } from './geminiService';
import { ollamaService } from './ollamaService';

export const aiService = {
    generateWorld: async (
        prompt: string,
        language: string,
        loreSource: string | undefined,
        playerRole: string | undefined,
        model: AIModel,
        apiConfig: APIConfig,
        logEvent: (message: string) => void
    ): Promise<{ worldState: WorldState, actions: PlayerAction[], imageUrl: string, groundingChunks?: any[] }> => {
        switch (model.provider) {
            case ModelProvider.GoogleAI:
// FIX: Incorrect number of arguments for geminiService.generateWorld. It takes 5, not 7.
                return geminiService.generateWorld(prompt, language, loreSource, playerRole, model.id);
            case ModelProvider.Ollama:
                return ollamaService.generateWorld(prompt, language, loreSource, playerRole, model.id, apiConfig, logEvent);
            default:
                throw new Error(`Unsupported model provider for world generation: ${model.provider}`);
        }
    },
    
    processAction: async (
        currentWorldState: WorldState,
        actionDescription: string,
        language: string,
        model: AIModel,
        apiConfig: APIConfig,
        logEvent: (message: string) => void
    ): Promise<{ worldState: WorldState, actions: PlayerAction[], chronicle: string, imageUrl: string, groundingChunks?: any[] }> => {
        switch (model.provider) {
            case ModelProvider.GoogleAI:
// FIX: Incorrect number of arguments for geminiService.processAction. It takes 4, not 6.
                return geminiService.processAction(currentWorldState, actionDescription, language, model.id);
            case ModelProvider.Ollama:
                return ollamaService.processAction(currentWorldState, actionDescription, language, model.id, apiConfig, logEvent);
            default:
                throw new Error(`Unsupported model provider for action processing: ${model.provider}`);
        }
    },

    clarifyAction: async (
        currentWorldState: WorldState,
        customAction: string,
        language: string,
        model: AIModel,
        apiConfig: APIConfig
    ): Promise<PlayerAction[]> => {
         switch (model.provider) {
            case ModelProvider.GoogleAI:
// FIX: Incorrect number of arguments for geminiService.clarifyAction. It takes 4, not 5.
                return geminiService.clarifyAction(currentWorldState, customAction, language, model.id);
            case ModelProvider.Ollama:
                 return ollamaService.clarifyAction(currentWorldState, customAction, language, model.id, apiConfig);
            default:
                throw new Error(`Unsupported model provider for action clarification: ${model.provider}`);
        }
    },

    detailEntity: async (entity: Entity, worldDescription: string, language: string, model: AIModel, apiConfig: APIConfig): Promise<Entity> => {
        // Use a simpler/faster model for this task regardless of provider
// FIX: Incorrect number of arguments for geminiService.detailEntity. It takes 3, not 5.
        return geminiService.detailEntity(entity, worldDescription, language);
    },

    rephraseActionAsThought: async (action: string, language: string, model: AIModel, apiConfig: APIConfig): Promise<string> => {
        // Use a simpler/faster model for this task
// FIX: Incorrect number of arguments for geminiService.rephraseActionAsThought. It takes 2, not 4.
        return geminiService.rephraseActionAsThought(action, language);
    },

    translateBatch: async (texts: string[], targetLanguage: string, model: AIModel, apiConfig: APIConfig): Promise<string[]> => {
        // Use a simpler/faster model for this task
// FIX: Incorrect number of arguments for geminiService.translateBatch. It takes 2, not 4.
        return geminiService.translateBatch(texts, targetLanguage);
    },

    regenerateImage: async (worldDescription: string, chronicleEntry: string, apiConfig: APIConfig): Promise<string> => {
        // Image generation is specific to Gemini for now
// FIX: Incorrect number of arguments for geminiService.regenerateImage. It takes 2, not 3.
        return geminiService.regenerateImage(worldDescription, chronicleEntry);
    },

    textToSpeech: async (text: string, apiConfig: APIConfig): Promise<string> => {
        // TTS is specific to Gemini for now
// FIX: Incorrect number of arguments for geminiService.textToSpeech. It takes 1, not 2.
        return geminiService.textToSpeech(text);
    }
};