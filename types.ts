// types.ts
import { FunctionDeclaration, Type } from "@google/genai";

/**
 * Represents a distinct object or character within the game world, as perceived by the player.
 */
export interface Entity {
  id: string;
  name: string;
  description: string;
}

/**
 * Represents an entity with its hidden "Game Master" state.
 */
export interface MasterEntity extends Entity {
  state?: string; // e.g., "locked", "friendly", "secretly a dragon"
}


/**
 * Represents a possible action the player can take.
 */
export interface PlayerAction {
  id: string;
  description: string;
}

/**
 * Represents a single step in a larger world goal or quest.
 */
export interface GoalStep {
    id: string;
    description: string;
    completed: boolean;
}

/**
 * Represents an overarching objective for the player in the current world. (Hidden from the player).
 */
export interface Goal {
    title: string;
    steps: GoalStep[];
}

/**
 * Contains all the hidden "Game Master" information about the world state.
 */
export interface GMInfo {
    goal?: Goal;
    entities: MasterEntity[];
    worldSummary?: string; // A high-level summary of the state of the *entire* world.
    nextCanonicalEvent?: string; // A description of the next major plot point that should occur.
    deviationAnalysis?: string; // An analysis of how the last player action affected the canon.
}

/**
 * Represents the player-visible state of the game world at a given moment.
 */
export interface WorldState {
  description: string;
  entities: Entity[]; // Player-visible entities
  imageUrl?: string;
  loreSource?: string;
  playerRole?: string;
  gmInfo: GMInfo; // Hidden information for the Game Master
}

/**
 * Represents a single point in the game's history, capturing a complete snapshot.
 * This enables saving, loading, and rewinding the game state.
 */
export interface HistoryEntry {
  worldState: WorldState;
  actions: PlayerAction[];
  playerAction: string; // The description of the action that led to this state.
  chronicleEntry: string; // The narrative outcome of the action.
  language?: string; // The language of the content in this entry
}

/**
 * Represents the structure of a saved world in IndexedDB.
 */
export interface SavedWorld {
  id: string;
  name: string;
  history: HistoryEntry[];
}

/**
 * Represents a map of saved worlds for quick lookup in the application state.
 */
export type SavedWorldsMap = Record<string, SavedWorld>;

// --- Multi-provider AI Types ---

export enum ModelProvider {
  GoogleAI = 'GoogleAI',
  Ollama = 'Ollama',
}

export interface AIModel {
  id: string;
  name: string;
  provider: ModelProvider;
}

export interface APIConfig {
  googleAIAPIKey?: string;
  ollamaHost?: string;
}

export interface AIToolCall {
    name: string;
    arguments: Record<string, any>;
}

export interface AIResponse {
  toolCalls: AIToolCall[] | null;
  text?: string;
}

export interface GeminiSchema {
  createLoreBasedWorldTool: FunctionDeclaration;
  updateLoreBasedWorldTool: FunctionDeclaration;
  actionsSchema: any;
  gmInfoSchema: any;
}
