# Generative World Engine

An immersive, generative storytelling experience powered by the Google Gemini API. This application allows users to create, explore, and interact with dynamic, AI-generated worlds through a rich, multimedia interface. It's designed as a platform for emergent narratives where the world evolves based on player choices and interests.

**Live Demo:** [https://neuroidss.github.io/Generative-World-Engine/](https://neuroidss.github.io/Generative-World-Engine/)

## Core Features

- **AI-Powered World Generation**: Create rich, atmospheric worlds from a simple text prompt. The Gemini API generates vivid descriptions, key entities, and a unique visual representation for each world.
- **Dynamic & Emergent Narratives**: The story is not pre-written. Every action a player takes is processed by the AI to generate a new world state, a narrative chronicle of events, and a new set of contextually relevant actions.
- **"Donghua" (Auto-Play) Mode**: Watch your world's story unfold like a cinematic animation. The AI takes control, choosing actions and narrating the story with character thoughts and events, synced with generated audio.
- **Full Session Management**:
  - **Robust Auto-Save**: Progress is saved automatically after every action to the browser's IndexedDB, allowing for large, complex worlds with full image histories.
  - **Save & Load**: Manage multiple game worlds and continue any session later.
  - **Efficient Import & Export**: Share your entire world history with others via a compact `.zip` archive that separates narrative data from images.
- **Time-Travel Mechanic**: Rewind the story to any previous point by simply clicking on an entry in the chronicles. Explore different choices and create alternate timelines.
- **Vibe Engineering**: The world responds to player interest. Focusing on an entity prompts the AI to generate more detailed descriptions, revealing hidden lore, magical properties, or history.
- **Multi-Modal Interaction**:
  - **Text-to-Speech Narration**: All world descriptions, chronicles, and character thoughts can be narrated with AI-generated voice.
  - **Voice Commands**: An "Eyes-Free" mode allows players to interact with the game entirely through voice commands.
- **On-the-Fly Translation**: The entire game state and UI can be translated in real-time by the Gemini API, allowing worlds to be played and shared across different languages.
- **Real-time Debug Panel**: An expandable panel shows real-time stats on API calls, entities, and rate-limiting controls to monitor performance and cost.

## Technology Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **AI & Generative Backend**: Google Gemini API
  - **`gemini-2.5-pro`**: For complex reasoning, world state generation, and narrative progression.
  - **`gemini-2.5-flash`**: For faster tasks like rephrasing actions and detailing entities.
  - **`gemini-2.5-flash-image`**: For generating atmospheric visuals for each scene.
  - **`gemini-2.5-flash-preview-tts`**: For high-quality text-to-speech narration.
- **Client-Side Storage**: IndexedDB for robust, large-scale data persistence.
- **Libraries**: `uuid` for unique ID generation, `jszip` for client-side zip archiving.

## How It Works

The engine is built on a continuous loop of interaction with the Gemini API and robust client-side storage.

1.  **Initialization**: A user provides a prompt, which is sent to Gemini to generate an initial `WorldState` (description, entities, image) and a set of `PlayerActions`.
2.  **Player Action**: The player chooses an action or proposes a custom one.
3.  **State Processing**: The current `WorldState` and the chosen `PlayerAction` are sent back to Gemini.
4.  **State Update**: Gemini processes this information and returns a new `WorldState`, a `chronicleEntry` (narrating what happened), and a new list of `PlayerActions`.
5.  **History & Persistence**: Each completed cycle is saved as a `HistoryEntry`. The entire world, including its full history and all associated images, is saved to IndexedDB after every turn.
6.  **Translation**: When the user switches languages, the text content of the entire history is batched and sent to Gemini for translation, allowing for seamless language portability.

This creates a flexible, RAG-like system where the "retrieved" knowledge is the current world state, and the "generation" is the next step in the story, ensuring a coherent and context-aware narrative.

## Running the Application

This application is designed to run in an environment where the Google Gemini API is accessible, such as AI Studio.

1.  **API Key**: Ensure that your environment has the `API_KEY` environment variable set with a valid Google Gemini API key.
2.  **Dependencies**: The project uses `es-module-shims` and an import map to load dependencies like React and `@google/genai` directly from a CDN.
3.  **Run**: Serve the `index.html` file. All application logic is bundled within the ES modules.
