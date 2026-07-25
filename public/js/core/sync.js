/**
 * Neev FLN Assessor - 2-Way Live Cloud Sync Engine (Firebase Firestore REST API)
 * Persists and syncs all entities (funders, projects, clusters, assessors, passages, schools, students, assessments)
 * between local IndexedDB and live Firebase Firestore.
 */
import { DB } from './db.js';

const FIRESTORE_BASE_URL = "https://firestore.googleapis.com/v1/projects/neev-fln-assessor/databases/(default)/documents";

export const SyncEngine = {
    // Converts JS Object to Firestore REST API payload format
    toFirestoreRestFormat: function(payload) {
        const processValue = (value) => {
            if (value === null || value === undefined) return null;
            if (typeof value === "string") {
                return { stringValue: value };
            } else if (typeof value === "number") {
                if (value % 1 === 0) {
                    return { integerValue: value.toString() };
                } else {
                    return { doubleValue: value };
                }
            } else if (typeof value === "boolean") {
                return { booleanValue: value };
            } else if (Array.isArray(value)) {
                return { arrayValue: { values: value.map(processValue).filter(v => v !== null) } };
            } else if (typeof value === "object") {
                const mapFields = {};
                for (const [k, v] of Object.entries(value)) {
                    const processed = processValue(v);
                    if (processed) mapFields[k] = processed;
                }
                return { mapValue: { fields: mapFields } };
            }
            return null;
        };

        const fields = {};
        for (const [key, value] of Object.entries(payload)) {
            const processed = processValue(value);
            if (processed) {
                fields[key] = processed;
            }
        }
        return { fields };
    },

    // Parses Firestore REST API Document response into standard JS Object
    fromFirestoreRestFormat: function(firestoreDoc) {
        if (!firestoreDoc || !firestoreDoc.fields) return null;

        const parseValue = (fieldVal) => {
            if (!fieldVal) return null;
            if (fieldVal.stringValue !== undefined) return fieldVal.stringValue;
            if (fieldVal.integerValue !== undefined) return parseInt(fieldVal.integerValue, 10);
            if (fieldVal.doubleValue !== undefined) return parseFloat(fieldVal.doubleValue);
            if (fieldVal.booleanValue !== undefined) return fieldVal.booleanValue;
            if (fieldVal.arrayValue) {
                return (fieldVal.arrayValue.values || []).map(parseValue);
            }
            if (fieldVal.mapValue) {
                const res = {};
                for (const [k, v] of Object.entries(fieldVal.mapValue.fields || {})) {
                    res[k] = parseValue(v);
                }
                return res;
            }
            return null;
        };

        const result = {};
        for (const [key, value] of Object.entries(firestoreDoc.fields)) {
            result[key] = parseValue(value);
        }

        // Extract ID from document resource path if not present in fields
        if (!result.id && firestoreDoc.name) {
            result.id = firestoreDoc.name.split('/').pop();
        }

        return result;
    },

    // Sync single record directly to live Firestore
    syncRecord: async function(collectionName, record) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.log(`Offline: Record ${record.id} saved locally in IndexedDB.`);
            return false;
        }

        try {
            const url = `${FIRESTORE_BASE_URL}/${collectionName}/${record.id}`;
            const payload = this.toFirestoreRestFormat(record);

            const response = await fetch(url, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                console.log(`[Firestore Sync] Successfully synced ${collectionName}/${record.id}`);
                return true;
            } else {
                console.warn(`[Firestore Sync] Failed to sync ${collectionName}/${record.id}:`, await response.text());
                return false;
            }
        } catch (err) {
            console.error(`[Firestore Sync Error] ${collectionName}/${record.id}:`, err);
            return false;
        }
    },

    // Delete single document from live Firestore
    deleteFromFirestore: async function(collectionName, docId) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
        try {
            const url = `${FIRESTORE_BASE_URL}/${collectionName}/${docId}`;
            const response = await fetch(url, { method: 'DELETE' });
            return response.ok;
        } catch (err) {
            console.error(`[Firestore Delete Error] ${collectionName}/${docId}:`, err);
            return false;
        }
    },

    // Pull collection items from Firestore into local IndexedDB
    pullCollectionFromFirestore: async function(collectionName) {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;
        try {
            const url = `${FIRESTORE_BASE_URL}/${collectionName}?pageSize=300`;
            const response = await fetch(url);
            if (!response.ok) return;

            const data = await response.json();
            const documents = data.documents || [];

            for (let doc of documents) {
                const parsed = this.fromFirestoreRestFormat(doc);
                if (parsed && parsed.id) {
                    await DB.put(collectionName, parsed);
                }
            }
            console.log(`[Firestore Pull] Hydrated ${documents.length} items for store: ${collectionName}`);
        } catch (err) {
            console.error(`[Firestore Pull Error] Collection ${collectionName}:`, err);
        }
    },

    // Pull all application collections from live Firestore
    pullAllFromFirestore: async function() {
        const collections = ['funders', 'projects', 'clusters', 'assessors', 'passages', 'schools', 'students', 'assessments'];
        for (let col of collections) {
            await this.pullCollectionFromFirestore(col);
        }
    },

    // Sync all pending unsynced records to live Firestore
    syncAll: async function() {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;

        const collections = ['funders', 'projects', 'clusters', 'assessors', 'passages', 'schools', 'students', 'assessments'];
        for (let storeName of collections) {
            const items = await DB.getAll(storeName);
            for (let item of items) {
                if (!item.synced || storeName !== 'assessments') {
                    const success = await this.syncRecord(storeName, item);
                    if (success && storeName === 'assessments') {
                        item.synced = true;
                        await DB.put('assessments', item);
                    }
                }
            }
        }
    },

    // Completely purge all documents from live Firestore collections (Clean Reset DB)
    purgeFirestore: async function() {
        if (typeof navigator !== 'undefined' && !navigator.onLine) return;

        const collections = ['funders', 'projects', 'clusters', 'assessors', 'passages', 'schools', 'students', 'assessments'];
        console.log("[Firestore Purge] Beginning cloud database purge...");

        for (let col of collections) {
            try {
                const url = `${FIRESTORE_BASE_URL}/${col}?pageSize=300`;
                const response = await fetch(url);
                if (!response.ok) continue;

                const data = await response.json();
                const documents = data.documents || [];

                for (let doc of documents) {
                    const docId = doc.name.split('/').pop();
                    // Retain superadmin profile in cloud DB as well
                    if (col === 'assessors' && docId === 'superadmin') continue;
                    await this.deleteFromFirestore(col, docId);
                }
            } catch (e) {
                console.error(`[Firestore Purge Error] ${col}:`, e);
            }
        }

        // Re-push master superadmin account to cloud DB
        const masterAdmin = await DB.get('assessors', 'superadmin');
        if (masterAdmin) {
            await this.syncRecord('assessors', masterAdmin);
        }
        console.log("[Firestore Purge] Cloud database purge complete.");
    }
};

// Global network listener to auto-sync when online
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log("[Network Restored] Triggering live Firestore sync...");
        SyncEngine.syncAll();
    });
}
