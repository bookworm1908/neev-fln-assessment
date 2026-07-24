/**
 * Neev FLN Assessor - Database & Cryptography Module
 * Implements IndexedDB storage and DPDP Act compliant local security.
 */

const DB_NAME = "NeevFLNDB";
const DB_VERSION = 4;

let dbInstance = null;
let activeSessionKey = null; // Volatile memory storage for derived AES key

// --- Cryptography & Security Helpers (DPDP Compliance) ---

export const CryptoHelper = {
    // Sets the active session key securely in module closure
    setActiveSessionKey: function(key) {
        activeSessionKey = key;
    },

    // Generates a cryptographically secure random salt
    generateSalt: function(length = 16) {
        const array = new Uint8Array(length);
        window.crypto.getRandomValues(array);
        return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Hashes a PIN or Passcode with a salt using SHA-256
    hashPIN: async function(pin, saltHex) {
        const encoder = new TextEncoder();
        const data = encoder.encode(pin + saltHex);
        const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Derives an AES-GCM key from a passcode using PBKDF2
    deriveKey: async function(passcode, saltHex) {
        const encoder = new TextEncoder();
        const passcodeKey = await window.crypto.subtle.importKey(
            "raw",
            encoder.encode(passcode),
            { name: "PBKDF2" },
            false,
            ["deriveKey"]
        );

        // Convert hex salt to Uint8Array
        const saltBuffer = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

        return window.crypto.subtle.deriveKey(
            {
                name: "PBKDF2",
                salt: saltBuffer,
                iterations: 10000,
                hash: "SHA-256"
            },
            passcodeKey,
            { name: "AES-GCM", length: 256 },
            false, // Cannot extract the key material
            ["encrypt", "decrypt"]
        );
    },

    // Encrypts a string using AES-GCM and the derived activeSessionKey
    encryptData: async function(text) {
        if (!activeSessionKey) throw new Error("No active session key. Please login.");
        
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(text);

        const cipherBuffer = await window.crypto.subtle.encrypt(
            { name: "AES-GCM", iv: iv },
            activeSessionKey,
            encodedData
        );

        // Return as hex strings for easy storage
        const cipherHex = Array.from(new Uint8Array(cipherBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
        const ivHex = Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('');
        
        return { iv: ivHex, cipher: cipherHex };
    },

    // Decrypts an object {iv, cipher} using AES-GCM and activeSessionKey
    decryptData: async function(encryptedObj) {
        if (!activeSessionKey) throw new Error("No active session key. Cannot decrypt PII.");
        if (!encryptedObj || !encryptedObj.cipher || !encryptedObj.iv) return null;

        const ivBuffer = new Uint8Array(encryptedObj.iv.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
        const cipherBuffer = new Uint8Array(encryptedObj.cipher.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));

        try {
            const decryptedBuffer = await window.crypto.subtle.decrypt(
                { name: "AES-GCM", iv: ivBuffer },
                activeSessionKey,
                cipherBuffer
            );
            const decoder = new TextDecoder();
            return decoder.decode(decryptedBuffer);
        } catch (e) {
            console.error("Decryption failed. Invalid key or corrupted data.", e);
            return null;
        }
    }
};

// --- IndexedDB Wrapper ---

export const DB = {
    init: function() {
        return new Promise((resolve, reject) => {
            if (dbInstance) return resolve(dbInstance);

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = (event) => reject("Database error: " + event.target.errorCode);

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                const transaction = event.target.transaction;

                // Config Store
                if (!db.objectStoreNames.contains('config')) {
                    db.createObjectStore('config', { keyPath: 'key' });
                }

                // Funders Store [NEW]
                let funderStore;
                if (!db.objectStoreNames.contains('funders')) {
                    funderStore = db.createObjectStore('funders', { keyPath: 'id' });
                } else {
                    funderStore = transaction.objectStore('funders');
                }
                if (!funderStore.indexNames.contains('name')) {
                    funderStore.createIndex('name', 'name', { unique: false });
                }

                // Projects Store [NEW]
                let projectStore;
                if (!db.objectStoreNames.contains('projects')) {
                    projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                } else {
                    projectStore = transaction.objectStore('projects');
                }
                if (!projectStore.indexNames.contains('name')) {
                    projectStore.createIndex('name', 'name', { unique: false });
                }
                if (!projectStore.indexNames.contains('status')) {
                    projectStore.createIndex('status', 'status', { unique: false });
                }

                // Assessors Store
                let assessorStore;
                if (!db.objectStoreNames.contains('assessors')) {
                    assessorStore = db.createObjectStore('assessors', { keyPath: 'id' });
                } else {
                    assessorStore = transaction.objectStore('assessors');
                }
                if (!assessorStore.indexNames.contains('username')) {
                    assessorStore.createIndex('username', 'username', { unique: false });
                }
                if (!assessorStore.indexNames.contains('teamLeaderId')) {
                    assessorStore.createIndex('teamLeaderId', 'teamLeaderId', { unique: false });
                }
                if (!assessorStore.indexNames.contains('funderId')) {
                    assessorStore.createIndex('funderId', 'funderId', { unique: false });
                }

                // Clusters Store [NEW]
                let clusterStore;
                if (!db.objectStoreNames.contains('clusters')) {
                    clusterStore = db.createObjectStore('clusters', { keyPath: 'id' });
                } else {
                    clusterStore = transaction.objectStore('clusters');
                }
                if (!clusterStore.indexNames.contains('district')) {
                    clusterStore.createIndex('district', 'district', { unique: false });
                }
                if (!clusterStore.indexNames.contains('block')) {
                    clusterStore.createIndex('block', 'block', { unique: false });
                }
                if (!clusterStore.indexNames.contains('teamLeaderId')) {
                    clusterStore.createIndex('teamLeaderId', 'teamLeaderId', { unique: false });
                }

                // Schools Store
                let schoolStore;
                if (!db.objectStoreNames.contains('schools')) {
                    schoolStore = db.createObjectStore('schools', { keyPath: 'id' });
                } else {
                    schoolStore = transaction.objectStore('schools');
                }
                if (!schoolStore.indexNames.contains('district')) {
                    schoolStore.createIndex('district', 'district', { unique: false });
                }
                if (!schoolStore.indexNames.contains('block')) {
                    schoolStore.createIndex('block', 'block', { unique: false });
                }
                if (!schoolStore.indexNames.contains('teamLeaderId')) {
                    schoolStore.createIndex('teamLeaderId', 'teamLeaderId', { unique: false });
                }
                if (!schoolStore.indexNames.contains('projectId')) {
                    schoolStore.createIndex('projectId', 'projectId', { unique: false });
                }
                if (!schoolStore.indexNames.contains('clusterId')) {
                    schoolStore.createIndex('clusterId', 'clusterId', { unique: false });
                }

                // Students Store
                let studentStore;
                if (!db.objectStoreNames.contains('students')) {
                    studentStore = db.createObjectStore('students', { keyPath: 'id' });
                } else {
                    studentStore = transaction.objectStore('students');
                }
                if (!studentStore.indexNames.contains('schoolId')) {
                    studentStore.createIndex('schoolId', 'schoolId', { unique: false });
                }
                if (!studentStore.indexNames.contains('projectId')) {
                    studentStore.createIndex('projectId', 'projectId', { unique: false });
                }
                if (!studentStore.indexNames.contains('funderId')) {
                    studentStore.createIndex('funderId', 'funderId', { unique: false });
                }
                if (!studentStore.indexNames.contains('clusterId')) {
                    studentStore.createIndex('clusterId', 'clusterId', { unique: false });
                }
                if (!studentStore.indexNames.contains('grade')) {
                    studentStore.createIndex('grade', 'grade', { unique: false });
                }
                if (!studentStore.indexNames.contains('academicYear')) {
                    studentStore.createIndex('academicYear', 'academicYear', { unique: false });
                }

                // Passages Store
                if (!db.objectStoreNames.contains('passages')) {
                    const passageStore = db.createObjectStore('passages', { keyPath: 'id' });
                    passageStore.createIndex('tier', 'tier', { unique: false });
                    passageStore.createIndex('language', 'language', { unique: false });
                }

                // Assessments Store
                let assessmentStore;
                if (!db.objectStoreNames.contains('assessments')) {
                    assessmentStore = db.createObjectStore('assessments', { keyPath: 'id' });
                } else {
                    assessmentStore = transaction.objectStore('assessments');
                }
                if (!assessmentStore.indexNames.contains('synced')) {
                    assessmentStore.createIndex('synced', 'synced', { unique: false });
                }
                if (!assessmentStore.indexNames.contains('studentId')) {
                    assessmentStore.createIndex('studentId', 'studentId', { unique: false });
                }
                if (!assessmentStore.indexNames.contains('clusterId')) {
                    assessmentStore.createIndex('clusterId', 'clusterId', { unique: false });
                }
                if (!assessmentStore.indexNames.contains('timestampStart')) {
                    assessmentStore.createIndex('timestampStart', 'timestampStart', { unique: false });
                }
                if (!assessmentStore.indexNames.contains('academicYear')) {
                    assessmentStore.createIndex('academicYear', 'academicYear', { unique: false });
                }
                if (!assessmentStore.indexNames.contains('term')) {
                    assessmentStore.createIndex('term', 'term', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                dbInstance = event.target.result;
                resolve(dbInstance);
            };
        });
    },

    put: async function(storeName, data) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], "readwrite");
            const store = tx.objectStore(storeName);
            const request = store.put(data);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    get: async function(storeName, key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], "readonly");
            const store = tx.objectStore(storeName);
            const request = store.get(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    getAll: async function(storeName) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], "readonly");
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },
    
    getByIndex: async function(storeName, indexName, value) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], "readonly");
            const store = tx.objectStore(storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    },

    delete: async function(storeName, key) {
        const db = await this.init();
        return new Promise((resolve, reject) => {
            const tx = db.transaction([storeName], "readwrite");
            const store = tx.objectStore(storeName);
            const request = store.delete(key);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
};

