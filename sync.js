/**
 * Neev FLN Assessor - Sync Engine
 * Handles background transmission to Google Sheets or Firebase Firestore via REST
 */

const SyncEngine = {
    // Converts our standard flat JSON into Firestore REST Document format
    toFirestoreRestFormat: function(payload) {
        const fields = {};
        for (const [key, value] of Object.entries(payload)) {
            if (typeof value === "string") {
                fields[key] = { stringValue: value };
            } else if (typeof value === "number") {
                // If it has decimals it's a double, else integer
                if (value % 1 === 0) {
                    fields[key] = { integerValue: value.toString() };
                } else {
                    fields[key] = { doubleValue: value };
                }
            } else if (typeof value === "boolean") {
                fields[key] = { booleanValue: value };
            }
        }
        return { fields };
    },

    // Trigger sync for all unsynced assessments
    syncAll: async function() {
        if (!navigator.onLine) {
            console.log("Offline: Cannot sync right now.");
            return;
        }

        const config = await DB.getAll('config');
        const syncUrl = config.find(c => c.key === 'sync_url')?.value;
        const syncMode = config.find(c => c.key === 'sync_mode')?.value; // 'firestore' or 'sheets'

        if (!syncUrl || !syncMode) {
            console.log("Sync configuration missing.");
            return;
        }

        const assessments = await DB.getByIndex('assessments', 'synced', false);
        if (assessments.length === 0) {
            console.log("No pending assessments to sync.");
            this.pruneOldRecords();
            return;
        }

        console.log(`Found ${assessments.length} pending assessments to sync.`);

        for (let record of assessments) {
            try {
                if (syncMode === 'firestore') {
                    // Firestore REST PATCH Request
                    const finalUrl = `${syncUrl}/assessments/${record.id}`;
                    const payload = this.toFirestoreRestFormat(record);
                    const response = await fetch(finalUrl, {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
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
        this.pruneOldRecords();
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

window.SyncEngine = SyncEngine;

// Attach online listener to trigger auto-sync when network returns
window.addEventListener('online', () => {
    console.log("Network restored. Triggering sync...");
    SyncEngine.syncAll();
});
