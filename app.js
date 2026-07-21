/**
 * Neev FLN Assessor - Core App Shell, Router, & Interactive Wiring
 * Connects Google Stitch HTML layouts to database, speech, sync, and grading logic.
 */

// --- i18n Dictionary ---
const i18nDict = {
    en: {
        appTitle: "Neev FLN Assessor",
        startBtn: "Start Assessment Session",
        loginBtn: "Login",
        syncBtn: "Sync Data",
        offlineMode: "Offline Mode",
        setupWizard: "First-Time Setup",
        demoDataOpt: "Explore with Demo Data",
        adminConsole: "Admin Console",
        selectStudent: "Select Student",
        tapToScore: "Tap to Score",
        correct: "Correct",
        incorrect: "Incorrect",
        accuracy: "Accuracy",
        wcpm: "WCPM",
        aboveGrade: "At/Above Grade Level",
        belowGrade: "Below Grade Level",
    },
    hi: {
        appTitle: "नीव FLN असेसर",
        startBtn: "मूल्यांकन शुरू करें",
        loginBtn: "लॉग इन",
        syncBtn: "सिंक करें",
        offlineMode: "ऑफ़लाइन मोड",
        setupWizard: "प्रारंभिक सेटअप",
        demoDataOpt: "डेमो डेटा के साथ देखें",
        adminConsole: "एडमिन कंसोल",
        selectStudent: "छात्र चुनें",
        tapToScore: "टैप टू स्कोर",
        correct: "सही",
        incorrect: "गलत",
        accuracy: "सटीकता",
        wcpm: "WCPM",
        aboveGrade: "ग्रेड स्तर पर/ऊपर",
        belowGrade: "ग्रेड स्तर से नीचे",
    },
    hinglish: {
        appTitle: "Neev FLN Assessor",
        startBtn: "Assessment Shuru Karein",
        loginBtn: "Login Karein",
        syncBtn: "Data Sync Karein",
        offlineMode: "Offline Mode",
        setupWizard: "Pehla Setup",
        demoDataOpt: "Demo Data ke saath dekhein",
        adminConsole: "Admin Console",
        selectStudent: "Student Select Karein",
        tapToScore: "Score ke liye Tap Karein",
        correct: "Sahi",
        incorrect: "Galat",
        accuracy: "Sateekta",
        wcpm: "WCPM",
        aboveGrade: "Grade level par/upar",
        belowGrade: "Grade level se neeche",
    }
};

let currentLang = 'en';

function setLanguage(lang) {
    if (!i18nDict[lang]) return;
    currentLang = lang;
    DB.put('config', { key: 'ui_lang', value: lang });
    
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (i18nDict[lang][key]) {
            if (el.tagName === 'INPUT' && (el.type === 'text' || el.type === 'password' || el.type === 'number')) {
                el.placeholder = i18nDict[lang][key];
            } else {
                el.innerText = i18nDict[lang][key];
            }
        }
    });
}

// --- App Router ---
const views = [
  'view-neev_fln_onboarding',
  'view-neev_fln_login',
  'view-neev_fln_dashboard',
  'view-neev_fln_numeracy_assessment',
  'view-neev_fln_assessment_results',
  'view-neev_fln_admin_assessors',
  'view-neev_fln_register_new_school',
  'view-neev_fln_register_student'
];

function showView(viewId) {
    views.forEach(v => {
        const el = document.getElementById(v);
        if (el) {
            if (v === viewId) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    });
}

// --- App State ---
let activeAssessor = null;
let selectedModule = 'literacy'; // 'literacy' or 'numeracy'
let currentAssessment = null;
let speechEngine = null;

// --- Keypad and Login Logic ---
let enteredPin = "";
const pinDotsContainer = document.querySelector('#view-neev_fln_login div.flex.items-center.justify-center.gap-lg.my-lg');

function updatePinDots() {
    if (!pinDotsContainer) return;
    const dots = pinDotsContainer.children;
    for (let i = 0; i < dots.length; i++) {
        if (i < enteredPin.length) {
            dots[i].className = "w-4 h-4 rounded-full bg-primary border-2 border-primary";
        } else {
            dots[i].className = "w-4 h-4 rounded-full border-2 border-outline-variant bg-surface";
        }
    }
}

async function verifyLogin() {
    const select = document.getElementById('assessor-select');
    const assessorId = select.value;
    if (!assessorId) {
        alert("Please select an Assessor");
        enteredPin = "";
        updatePinDots();
        return;
    }

    const assessor = await DB.get('assessors', assessorId);
    if (!assessor) {
        alert("Assessor not found");
        return;
    }

    const hashedInput = await CryptoHelper.hashPIN(enteredPin, assessor.salt);
    if (hashedInput === assessor.pinHash) {
        // Derive key and save to volatile state
        activeSessionKey = await CryptoHelper.deriveKey(enteredPin, assessor.salt);
        activeAssessor = assessor;
        
        enteredPin = "";
        updatePinDots();
        showView('view-neev_fln_dashboard');
        loadDashboardDropdowns();
    } else {
        alert("Incorrect PIN");
        enteredPin = "";
        updatePinDots();
    }
}

function setupLoginKeypad() {
    const buttons = document.querySelectorAll('#view-neev_fln_login footer button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.innerText.trim();
            if (val === 'Clear') {
                enteredPin = "";
            } else if (btn.querySelector('span') || val === '') { // backspace symbol
                enteredPin = enteredPin.slice(0, -1);
            } else {
                if (enteredPin.length < 4) {
                    enteredPin += val;
                }
            }
            updatePinDots();
            if (enteredPin.length === 4) {
                verifyLogin();
            }
        });
    });
}

// --- Onboarding Wireup ---
function setupOnboarding() {
    const cards = document.querySelectorAll('#view-neev_fln_onboarding .onboarding-card');
    if (cards.length >= 3) {
        // Explore with Demo Data
        cards[0].addEventListener('click', async () => {
            await injectDemoData();
        });
        
        // Setup for NGO
        cards[1].addEventListener('click', () => {
            showView('view-neev_fln_register_new_school');
        });

        // Import NGO Config
        cards[2].addEventListener('click', () => {
            alert("Roster import file dialog trigger mockup");
        });
    }
}

// --- Dashboard &Cascading Dropdowns ---
async function loadDashboardDropdowns() {
    const schools = await DB.getAll('schools');
    const districtSelect = document.getElementById('district');
    const schoolSelect = document.getElementById('school');
    const gradeSelect = document.getElementById('grade');
    const studentSelect = document.getElementById('student');

    if (!districtSelect) return;

    // Populate districts
    const districts = [...new Set(schools.map(s => s.district))];
    districtSelect.innerHTML = '<option disabled selected value="">Choose a district...</option>';
    districts.forEach(d => {
        districtSelect.innerHTML += `<option value="${d}">${d}</option>`;
    });

    districtSelect.onchange = () => {
        const filteredSchools = schools.filter(s => s.district === districtSelect.value);
        schoolSelect.innerHTML = '<option disabled selected value="">Choose a school...</option>';
        filteredSchools.forEach(s => {
            schoolSelect.innerHTML += `<option value="${s.id}">${s.name}</option>`;
        });
        gradeSelect.innerHTML = '<option disabled selected value="">Choose a grade...</option>';
        studentSelect.innerHTML = '<option disabled selected value="">Choose a student...</option>';
    };

    schoolSelect.onchange = () => {
        gradeSelect.innerHTML = '<option disabled selected value="">Choose a grade...</option>';
        for (let i = 1; i <= 12; i++) {
            gradeSelect.innerHTML += `<option value="${i}">Grade ${i}</option>`;
        }
        studentSelect.innerHTML = '<option disabled selected value="">Choose a student...</option>';
    };

    gradeSelect.onchange = async () => {
        const students = await DB.getByIndex('students', 'schoolId', schoolSelect.value);
        studentSelect.innerHTML = '<option disabled selected value="">Choose a student...</option>';
        
        for (let st of students) {
            if (st.grade === parseInt(gradeSelect.value)) {
                // Decrypt student name for display
                const name = await CryptoHelper.decryptData(st.name);
                studentSelect.innerHTML += `<option value="${st.id}">${name}</option>`;
            }
        }
    };
}

function setupDashboard() {
    const moduleSegmentButtons = document.querySelectorAll('#view-neev_fln_dashboard section.flex > button');
    
    if (moduleSegmentButtons.length >= 2) {
        moduleSegmentButtons[0].addEventListener('click', () => {
            selectedModule = 'literacy';
            moduleSegmentButtons[0].className = "flex-1 py-sm px-md rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg transition-colors shadow-sm text-center";
            moduleSegmentButtons[1].className = "flex-1 py-sm px-md rounded-full text-on-surface-variant font-label-lg text-label-lg hover:bg-surface-container-highest transition-colors text-center";
        });

        moduleSegmentButtons[1].addEventListener('click', () => {
            selectedModule = 'numeracy';
            moduleSegmentButtons[1].className = "flex-1 py-sm px-md rounded-full bg-primary-container text-on-primary-container font-label-lg text-label-lg transition-colors shadow-sm text-center";
            moduleSegmentButtons[0].className = "flex-1 py-sm px-md rounded-full text-on-surface-variant font-label-lg text-label-lg hover:bg-surface-container-highest transition-colors text-center";
        });
    }

    const startBtns = document.querySelectorAll('#view-neev_fln_dashboard button.bg-success');
    startBtns.forEach(btn => {
        btn.addEventListener('click', async () => {
            const studentId = document.getElementById('student').value;
            if (!studentId) {
                alert("Please select a student first");
                return;
            }
            startAssessment(studentId);
        });
    });
}

// --- Assessment Processors ---
async function startAssessment(studentId) {
    const student = await DB.get('students', studentId);
    const decryptedName = await CryptoHelper.decryptData(student.name);

    currentAssessment = {
        id: CryptoHelper.generateSalt(24),
        studentId: student.id,
        studentName: decryptedName,
        grade: student.grade,
        module: selectedModule,
        timestampStart: Date.now(),
        synced: false
    };

    // Update Header
    const assessmentHeader = document.querySelector('#view-neev_fln_numeracy_assessment header h1');
    if (assessmentHeader) {
        assessmentHeader.innerText = `${decryptedName}, Grade ${student.grade}`;
    }

    showView('view-neev_fln_numeracy_assessment');

    const numHeader = document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(1)');
    const numGrid = document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(2)');
    const arithSection = document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(3)');
    
    // Remove existing literacy if present
    const oldLit = document.getElementById('literacy-section');
    if (oldLit) oldLit.remove();

    if (selectedModule === 'numeracy') {
        numHeader.classList.remove('hidden');
        numGrid.classList.remove('hidden');
        arithSection.classList.remove('hidden');
        runNumeracyTask();
    } else {
        numHeader.classList.add('hidden');
        numGrid.classList.add('hidden');
        arithSection.classList.add('hidden');
        runLiteracyTask();
    }
}

// --- Numeracy Logic ---
let numeracyState = {
    step: 1, // 1: Number Rec, 2: Arithmetic
    recAnswers: [true, true, true, true, true],
    arithAnswers: []
};

function runNumeracyTask() {
    numeracyState = { step: 1, recAnswers: [true, true, true, true, true], arithAnswers: [] };
    const numCards = document.querySelectorAll('#view-neev_fln_numeracy_assessment main > section:nth-of-type(2) > div');
    
    // Wire up number recognition card clicking
    numCards.forEach((card, index) => {
        // Reset card styling to Correct (Green)
        card.className = "bg-primary-container bg-opacity-30 border border-primary-container rounded-xl p-lg flex flex-col items-center justify-center gap-sm relative ambient-shadow-hover transition-all group cursor-pointer";
        const iconDiv = card.querySelector('div');
        iconDiv.className = "absolute top-sm right-sm text-[#388E3C] bg-white rounded-full p-xs shadow-sm flex items-center justify-center w-6 h-6";
        iconDiv.querySelector('span').innerText = "check";
        
        card.onclick = () => {
            numeracyState.recAnswers[index] = !numeracyState.recAnswers[index];
            if (numeracyState.recAnswers[index]) {
                card.className = "bg-primary-container bg-opacity-30 border border-primary-container rounded-xl p-lg flex flex-col items-center justify-center gap-sm relative ambient-shadow-hover transition-all group cursor-pointer";
                iconDiv.className = "absolute top-sm right-sm text-[#388E3C] bg-white rounded-full p-xs shadow-sm flex items-center justify-center w-6 h-6";
                iconDiv.querySelector('span').innerText = "check";
            } else {
                card.className = "bg-error-container bg-opacity-30 border border-error bg-opacity-20 rounded-xl p-lg flex flex-col items-center justify-center gap-sm relative ambient-shadow-hover transition-all group cursor-pointer";
                iconDiv.className = "absolute top-sm right-sm text-error bg-white rounded-full p-xs shadow-sm flex items-center justify-center w-6 h-6";
                iconDiv.querySelector('span').innerText = "close";
            }
        };
    });

    // Wire up correct/incorrect action buttons in bottom footer
    const crossBtn = document.querySelector('#view-neev_fln_numeracy_assessment div.fixed.bottom-0 button:nth-of-type(1)');
    const checkBtn = document.querySelector('#view-neev_fln_numeracy_assessment div.fixed.bottom-0 button:nth-of-type(2)');

    // Hide arithmetic card until step 2
    document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(3)').classList.add('hidden');

    checkBtn.onclick = () => {
        if (numeracyState.step === 1) {
            // Move to Step 2: Arithmetic
            numeracyState.step = 2;
            document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(2)').classList.add('hidden');
            document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(3)').classList.remove('hidden');
            document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(1) h2').innerText = "Task 2: Arithmetic Operations";
            nextArithmeticQuestion();
        } else {
            numeracyState.arithAnswers.push(true);
            nextArithmeticQuestion();
        }
    };

    crossBtn.onclick = () => {
        if (numeracyState.step === 1) {
            // Rec failed
            checkBtn.click();
        } else {
            numeracyState.arithAnswers.push(false);
            nextArithmeticQuestion();
        }
    };
}

const mathQuestions = [
    "2 + 3 = ?",
    "7 - 4 = ?",
    "12 / 3 = ?",
    "24 / 4 = ?",
    "5 x 5 = ?"
];

function nextArithmeticQuestion() {
    const index = numeracyState.arithAnswers.length;
    if (index >= mathQuestions.length) {
        // Assessment complete, compile results
        compileNumeracyResults();
        return;
    }
    const mathCard = document.querySelector('#view-neev_fln_numeracy_assessment main > section:nth-of-type(3) div.text-on-surface');
    if (mathCard) {
        mathCard.innerText = mathQuestions[index];
    }
}

function compileNumeracyResults() {
    const recCount = numeracyState.recAnswers.filter(a => a).length;
    const opsCount = numeracyState.arithAnswers.filter(a => a).length;
    
    const recPct = (recCount / 5) * 100;
    const passed = Grading.evaluateNumeracyTier(Math.ceil(currentAssessment.grade / 3), recPct, opsCount);
    
    currentAssessment.telemetry = {
        numberRecScore: recPct,
        operationsScore: opsCount,
        recAnswers: numeracyState.recAnswers,
        arithAnswers: numeracyState.arithAnswers
    };
    currentAssessment.gradeAlignment = Grading.calculateGradeAlignment(currentAssessment.grade, Math.ceil(currentAssessment.grade / 3), passed);
    
    showResultsView(passed, `Number Rec: ${recPct}%, Operations: ${opsCount}/5`);
}

// --- Literacy Logic ---
let literacyState = {
    passage: null,
    wordStatuses: []
};

async function runLiteracyTask() {
    // Get passage based on expected Tier
    const tier = Math.ceil(currentAssessment.grade / 3);
    const passages = await DB.getByIndex('passages', 'tier', tier);
    const passage = passages[0] || { content: "Sample passage. Reading is fun and helpful.", words: ["sample","passage","reading","is","fun","and","helpful"] };
    
    literacyState.passage = passage;
    literacyState.wordStatuses = new Array(passage.words.length).fill("correct"); // Default is correct

    const main = document.querySelector('#view-neev_fln_numeracy_assessment main');
    const litSection = document.createElement('section');
    litSection.id = 'literacy-section';
    litSection.className = 'flex flex-col gap-lg w-full max-w-md mx-auto';
    litSection.innerHTML = `
        <h2 class="font-title-lg text-title-lg text-on-surface">Task 1: Oral Reading Fluency</h2>
        <div class="bg-surface border border-outline-variant rounded-[24px] p-xl flex flex-wrap gap-2 text-xl leading-loose" id="literacy-words">
            ${passage.words.map((w, i) => `<span class="passage-word cursor-pointer px-1 rounded transition-colors" data-index="${i}">${w}</span>`).join(' ')}
        </div>
        <div class="flex justify-center gap-md mt-md">
            <button id="mic-btn" class="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center hover:bg-surface-tint shadow-lg transition-transform active:scale-95">
                <span class="material-symbols-outlined">mic</span>
            </button>
        </div>
    `;
    main.appendChild(litSection);

    // Bind tap to score listeners on words
    const wordSpans = litSection.querySelectorAll('.passage-word');
    wordSpans.forEach(span => {
        span.onclick = () => {
            const idx = parseInt(span.getAttribute('data-index'));
            const status = literacyState.wordStatuses[idx];
            
            // Cycle: correct -> incorrect -> skipped -> correct
            if (status === 'correct') {
                literacyState.wordStatuses[idx] = 'incorrect';
                span.className = 'passage-word cursor-pointer word-error';
            } else if (status === 'incorrect') {
                literacyState.wordStatuses[idx] = 'skipped';
                span.className = 'passage-word cursor-pointer word-skipped';
            } else {
                literacyState.wordStatuses[idx] = 'correct';
                span.className = 'passage-word cursor-pointer';
            }
        };
    });

    // Mic recording trigger
    const micBtn = document.getElementById('mic-btn');
    let isRecording = false;
    
    if (micBtn) {
        speechEngine = new SpeechEngine();
        micBtn.onclick = () => {
            if (!isRecording) {
                isRecording = true;
                micBtn.classList.add('bg-error', 'pulse-mic');
                micBtn.classList.remove('bg-primary');
                speechEngine.start('en-IN', passage.words, (matchIndex, status) => {
                    // Update matching visual highlighting
                    const targetSpan = litSection.querySelector(`.passage-word[data-index="${matchIndex}"]`);
                    if (targetSpan) {
                        targetSpan.className = 'passage-word cursor-pointer word-correct';
                        literacyState.wordStatuses[matchIndex] = 'correct';
                    }
                }, (error) => {
                    alert("Speech Engine Error: " + error);
                    micBtn.click(); // Auto-stop
                });
            } else {
                isRecording = false;
                micBtn.classList.remove('bg-error', 'pulse-mic');
                micBtn.classList.add('bg-primary');
                speechEngine.stop();
            }
        };
    }

    // Fixed bottom footer buttons triggers finish
    const crossBtn = document.querySelector('#view-neev_fln_numeracy_assessment div.fixed.bottom-0 button:nth-of-type(1)');
    const checkBtn = document.querySelector('#view-neev_fln_numeracy_assessment div.fixed.bottom-0 button:nth-of-type(2)');

    // In literacy, checking completes assessment
    checkBtn.onclick = () => {
        if (isRecording) {
            micBtn.click(); // stop recording
        }
        compileLiteracyResults();
    };

    crossBtn.onclick = () => {
        // Cancel/Back to dashboard
        if (isRecording) {
            micBtn.click();
        }
        showView('view-neev_fln_dashboard');
    };
}

function compileLiteracyResults() {
    const errorCount = literacyState.wordStatuses.filter(s => s === 'incorrect').length;
    const skippedCount = literacyState.wordStatuses.filter(s => s === 'skipped').length;
    const totalWords = literacyState.passage.words.length;
    const durationSeconds = 30; // standard sample duration

    const metrics = Grading.calculateLiteracyMetrics(totalWords, errorCount + skippedCount, durationSeconds);
    const passed = Grading.evaluateLiteracyTier(Math.ceil(currentAssessment.grade / 3), metrics.wcpm, metrics.accuracy, 1, 1);
    
    currentAssessment.telemetry = {
        totalWords,
        errorCount,
        skippedCount,
        durationSeconds,
        wcpm: metrics.wcpm,
        accuracy: metrics.accuracy
    };
    currentAssessment.gradeAlignment = Grading.calculateGradeAlignment(currentAssessment.grade, Math.ceil(currentAssessment.grade / 3), passed);
    
    showResultsView(passed, `WCPM: ${metrics.wcpm}, Accuracy: ${metrics.accuracy}%`);
}

// --- Results Handling ---
function showResultsView(passed, metricsText) {
    showView('view-neev_fln_assessment_results');

    // Update progress circular indicator
    const percentText = document.querySelector('#view-neev_fln_assessment_results svg + div span.text-primary');
    const labelText = document.querySelector('#view-neev_fln_assessment_results svg + div span.text-on-surface-variant');
    const circle = document.querySelector('#view-neev_fln_assessment_results circle.text-primary');

    if (percentText) percentText.innerText = passed ? "PASS" : "FAIL";
    if (labelText) labelText.innerText = metricsText;
    
    if (circle) {
        // Tonal progress circle ring mapping
        circle.setAttribute('stroke-dashoffset', passed ? "0" : "150");
    }

    const badge = document.querySelector('#view-neev_fln_assessment_results div.bg-\\[\\#d4edda\\] span.font-label-lg');
    const badgeContainer = document.querySelector('#view-neev_fln_assessment_results div.bg-\\[\\#d4edda\\]');
    
    if (badge) {
        badge.innerText = passed ? "NIPUN FLN Benchmark Met" : "Below Expected FLN Benchmark";
        if (passed) {
            badgeContainer.className = "bg-[#d4edda] text-[#155724] px-4 py-2 rounded-lg border border-[#c3e6cb] flex items-center gap-2";
        } else {
            badgeContainer.className = "bg-error-container text-[#93000a] px-4 py-2 rounded-lg border border-error bg-opacity-20 flex items-center gap-2";
        }
    }

    // Save submit button wiring
    const submitBtn = document.querySelector('#view-neev_fln_assessment_results button.bg-primary-container');
    if (submitBtn) {
        submitBtn.onclick = async () => {
            await DB.put('assessments', currentAssessment);
            showView('view-neev_fln_dashboard');
            SyncEngine.syncAll();
        };
    }
}

// --- Initialization ---
async function initApp() {
    // Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').then(() => {
            console.log('Service Worker Registered');
        }).catch(err => console.error('SW Registration failed', err));
    }

    await DB.init();
    
    // Load config language
    const savedLang = await DB.get('config', 'ui_lang');
    if (savedLang) {
        setLanguage(savedLang.value);
    } else {
        setLanguage('en');
    }

    // Check if assessors exist
    const assessors = await DB.getAll('assessors');
    if (assessors.length > 0) {
        // Populate Select List
        const select = document.getElementById('assessor-select');
        if (select) {
            select.innerHTML = '<option disabled selected value="">Tap to choose...</option>';
            assessors.forEach(a => {
                select.innerHTML += `<option value="${a.id}">${a.username}</option>`;
            });
        }
        showView('view-neev_fln_login');
    } else {
        showView('view-neev_fln_onboarding');
    }

    setupOnboarding();
    setupLoginKeypad();
    setupDashboard();
}

// Demo Data Injector
async function injectDemoData() {
    // Pre-populate sample passages (Tier 1-4)
    const passages = [
        { id: "pass-tier1-en", tier: 1, language: "en", title: "The Cat", content: "The cat sat on the mat. It was a fat cat.", words: ["the","cat","sat","on","the","mat","it","was","a","fat","cat"] },
        { id: "pass-tier1-hi", tier: 1, language: "hi", title: "बिल्ली", content: "बिल्ली चटाई पर बैठी।", words: ["बिल्ली","चटाई","पर","बैठी"] }
    ];
    for (let p of passages) {
        await DB.put('passages', p);
    }
    
    // Pre-populate schools and students
    const schools = [
        { id: "sch1", name: "Govt. Primary School Kanpur", district: "Kanpur" },
        { id: "sch2", name: "Etasha Remedial Center", district: "Delhi" }
    ];
    for (let s of schools) {
        await DB.put('schools', s);
    }

    // Salt and Encrypt Student names/rolls for security
    const studentData = [
        { id: "st1", name: "Rohan Sharma", roll: "101", grade: 3, schoolId: "sch1" },
        { id: "st2", name: "Neha Patel", roll: "102", grade: 2, schoolId: "sch1" }
    ];

    // Build assessor master pin
    const salt = CryptoHelper.generateSalt();
    const pinHash = await CryptoHelper.hashPIN("1234", salt);
    await DB.put('assessors', { id: "admin", username: "Admin", pinHash: pinHash, salt: salt });

    // Derive demo AES key locally to encrypt mock roster
    activeSessionKey = await CryptoHelper.deriveKey("1234", salt);

    for (let s of studentData) {
        const encName = await CryptoHelper.encryptData(s.name);
        const encRoll = await CryptoHelper.encryptData(s.roll);
        await DB.put('students', {
            id: s.id,
            name: encName,
            rollNumber: encRoll,
            grade: s.grade,
            schoolId: s.schoolId
        });
    }

    alert("Kanpur Demo data roster loaded! Login PIN is 1234");
    
    // Repopulate Select dropdown
    const select = document.getElementById('assessor-select');
    if (select) {
        select.innerHTML = `<option value="admin">Admin</option>`;
    }
    
    showView('view-neev_fln_login');
}

window.App = {
    setLanguage,
    showView,
    initApp,
    injectDemoData
};

document.addEventListener("DOMContentLoaded", () => {
    initApp();
});
