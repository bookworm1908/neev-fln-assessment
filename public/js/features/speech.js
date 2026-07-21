/**
 * Neev FLN Assessor - Bilingual Web Speech Engine
 * Implements sliding-window Levenshtein matching and offline diagnostics
 */

export class SpeechEngine {
    constructor() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            console.error("Speech Recognition not supported in this browser.");
            this.supported = false;
            return;
        }
        this.supported = true;
        this.recognition = new SpeechRecognition();
        this.recognition.continuous = true;
        this.recognition.interimResults = true;
        
        // State variables
        this.passageWords = [];
        this.currentIndex = 0;
        this.onMatchUpdate = null;
        this.onErrorCallback = null;
        this.silenceTimer = null;
        this.lastMatchTime = Date.now();
        
        this._setupListeners();
    }

    _setupListeners() {
        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            if (finalTranscript.trim().length > 0) {
                this._processTranscript(finalTranscript);
                this._resetSilenceTimer();
            }
        };

        this.recognition.onerror = (event) => {
            console.error("Speech Error:", event.error);
            if (event.error === 'network' && !navigator.onLine) {
                if (this.onErrorCallback) this.onErrorCallback("OFFLINE_VOICE_MISSING");
            }
        };
    }

    _resetSilenceTimer() {
        clearTimeout(this.silenceTimer);
        this.lastMatchTime = Date.now();
        this.silenceTimer = setTimeout(() => {
            console.log("10 seconds silence detected. Auto-stopping.");
            this.stop();
        }, 10000);
    }

    // Normalizes Hindi/English text by removing punctuation and lowercasing
    _normalize(text) {
        return text.toLowerCase().replace(/[.,!?;:।]/g, "").trim();
    }

    // Computes Levenshtein distance
    _levenshtein(a, b) {
        if(a.length === 0) return b.length;
        if(b.length === 0) return a.length;
        const matrix = [];
        for(let i = 0; i <= b.length; i++){ matrix[i] = [i]; }
        for(let j = 0; j <= a.length; j++){ matrix[0][j] = j; }
        for(let i = 1; i <= b.length; i++){
            for(let j = 1; j <= a.length; j++){
                if(b.charAt(i-1) == a.charAt(j-1)){
                    matrix[i][j] = matrix[i-1][j-1];
                } else {
                    matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, Math.min(matrix[i][j-1] + 1, matrix[i-1][j] + 1));
                }
            }
        }
        return matrix[b.length][a.length];
    }

    // Sliding window alignment (look ahead 5 words)
    _processTranscript(transcript) {
        const spokenWords = this._normalize(transcript).split(/\s+/);
        
        for (let spokenWord of spokenWords) {
            if (!spokenWord) continue;

            let matchFound = false;
            let windowEnd = Math.min(this.currentIndex + 5, this.passageWords.length);

            for (let i = this.currentIndex; i < windowEnd; i++) {
                const targetWord = this.passageWords[i];
                const targetLen = targetWord.length;
                
                // Allowed distance based on word length
                let allowedDist = 0;
                if (targetLen >= 4 && targetLen <= 6) allowedDist = 1;
                else if (targetLen >= 7) allowedDist = 2;

                const dist = this._levenshtein(spokenWord, targetWord);
                
                if (dist <= allowedDist) {
                    // We found a match at index i
                    // Any words between currentIndex and i are considered skipped (errors)
                    this.currentIndex = i + 1; // Move pointer forward
                    if (this.onMatchUpdate) this.onMatchUpdate(i, "correct");
                    matchFound = true;
                    break;
                }
            }
            // If matchFound is false, we ignore the word (stutter/noise)
        }
    }

    start(lang, passageArray, onMatchCallback, onErrorCallback) {
        if (!this.supported) return;
        this.recognition.lang = lang; // 'hi-IN' or 'en-IN'
        this.passageWords = passageArray.map(w => this._normalize(w));
        this.currentIndex = 0;
        this.onMatchUpdate = onMatchCallback;
        this.onErrorCallback = onErrorCallback;
        
        try {
            this.recognition.start();
            this._resetSilenceTimer();
        } catch(e) {
            console.error(e);
        }
    }

    stop() {
        if (!this.supported) return;
        clearTimeout(this.silenceTimer);
        try {
            this.recognition.stop();
        } catch(e) {}
    }
}
