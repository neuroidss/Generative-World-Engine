// services/dbService.ts

import { SavedWorld } from "../types";

const DB_NAME = 'GenerativeWorldEngineDB';
const DB_VERSION = 1;
const STORE_NAME = 'worlds';

let db: IDBDatabase | null = null;

const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error("IndexedDB error:", request.error);
            reject("Error opening IndexedDB.");
        };

        request.onsuccess = (event) => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const tempDb = request.result;
            if (!tempDb.objectStoreNames.contains(STORE_NAME)) {
                tempDb.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
    });
};

const saveWorld = async (world: SavedWorld): Promise<void> => {
    return new Promise(async (resolve, reject) => {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(world);

        request.onsuccess = () => {
            resolve();
        };

        request.onerror = () => {
            console.error("Error saving world:", request.error);
            reject("Could not save the world to the database.");
        };
    });
};

const getAllWorlds = async (): Promise<SavedWorld[]> => {
    return new Promise(async (resolve, reject) => {
        const db = await initDB();
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
            resolve(request.result);
        };

        request.onerror = () => {
            console.error("Error getting all worlds:", request.error);
            reject("Could not retrieve worlds from the database.");
        };
    });
};

export const dbService = {
    initDB,
    saveWorld,
    getAllWorlds,
};
