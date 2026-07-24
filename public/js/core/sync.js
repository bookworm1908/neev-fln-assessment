/**
 * Neev FLN Assessor - Sync Engine
 * Handles background transmission to Google Sheets or Firebase Firestore via REST
 */
import { DB } from './db.js';

export const SyncEngine = {
    toFirestoreRestFormat: function(payload) {
        const processValue = (value) => {
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
            } else if (typeof value === "object" && value !== null) {
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

    // Trigger sync for all unsynced assessments
    syncAll: async function() {
        // If navigator.onLine is false, don't attempt REST
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
            console.log("Offline: Cannot sync right now.");
            return;
        }

        const config = await DB.getAll('config');
        const syncUrl = config.find(c => c.key === 'sync_url')?.value;
        const syncMode = config.find(c => c.key === 'sync_mode')?.value || 'firestore'; 

        if (!syncUrl && syncMode !== 'firestore') {
            console.log("Sync configuration missing.");
            return;
        }

        const assessments = await DB.getByIndex('assessments', 'synced', false);
        if (assessments.length === 0) {
            console.log("No pending assessments to sync.");
            await this.pruneOldRecords();
            return;
        }

        console.log(`Found ${assessments.length} pending assessments to sync.`);

        // In a real implementation, get the Firebase Auth ID Token.
        const authToken = localStorage.getItem('firebase_id_token') || '';

        for (let record of assessments) {
            try {
                if (syncMode === 'firestore') {
                    // Firestore REST PATCH Request to live neev-fln-assessor project
                    const finalUrl = syncUrl ? `${syncUrl}/assessments/${record.id}` : `https://firestore.googleapis.com/v1/projects/neev-fln-assessor/databases/(default)/documents/assessments/${record.id}`;
                    
                    const payload = this.toFirestoreRestFormat(record);
                    const response = await fetch(finalUrl, {
                        method: 'PATCH',
                        headers: { 
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${authToken}`
                        },
                        body: JSON.stringify(payload)
                    });
                    if (response.ok) {
                        record.synced = true;
                        await DB.put('assessments', record);
                    }
                } else if (syncMode === 'sheets') {
                    // Google Sheets Webhook POST
                    const response = await fetch(syncUrl, {
                        method: 'POST',
                        body: JSON.stringify(record)
                    });
                    if (response.ok) {
                        record.synced = true;
                        await DB.put('assessments', record);
                    }
                }
            } catch (e) {
                console.error("Sync failed for record", record.id, e);
            }
        }

        // Run auto-pruner after sync completes
        await this.pruneOldRecords();
    },

    // 30-day auto-pruning to comply with data privacy policies
    pruneOldRecords: async function() {
        const syncedRecords = await DB.getByIndex('assessments', 'synced', true);
        const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
        const now = Date.now();

        let prunedCount = 0;
        for (let record of syncedRecords) {
            if (now - record.timestampStart > thirtyDaysMs) {
                await DB.delete('assessments', record.id);
                prunedCount++;
            }
        }
        if (prunedCount > 0) {
            console.log(`Pruned ${prunedCount} old synced records.`);
        }
    }
};

// Fallback listener if Background Sync API fails or is not supported
if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
        console.log("Network restored. Checking sync capabilities...");
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(sw => {
                return sw.sync.register('sync-assessments');
            }).catch(() => {
                SyncEngine.syncAll();
            });
        } else {
            SyncEngine.syncAll();
        }
    });
}
