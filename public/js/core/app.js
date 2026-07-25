/**
 * Neev FLN Assessor - Core App Shell, Router, & Interactive Wiring
 * Connects Google Stitch HTML layouts to database, speech, sync, and grading logic.
 */
import { DB, CryptoHelper } from './db.js';
import { SyncEngine } from './sync.js';
import { SpeechEngine } from '../features/speech.js';
import { Grading } from '../features/grading.js';

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
        onboarding: "Onboarding"
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
        onboarding: "ऑनबोर्डिंग"
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
        onboarding: "Onboarding"
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
  'view-neev_fln_register_student',
  'view-neev_fln_school_admin_dashboard',
  'view-neev_fln_super_admin_dashboard',
  'view-neev_fln_stakeholder_dashboard'
];

function showView(viewId, pushToHistory = true) {
    function updatePinDots() {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((dot, index) => {
            if (index < enteredPin.length) {
                dot.classList.add('bg-primary', 'border-primary');
                dot.classList.remove('bg-surface', 'border-outline-variant');
            } else {
                dot.classList.remove('bg-primary', 'border-primary');
                dot.classList.add('bg-surface', 'border-outline-variant');
            }
        });
    }
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
    
    if (viewId === 'view-neev_fln_super_admin_dashboard' && window.renderSuperAdminDashboardConsoles) {
        window.renderSuperAdminDashboardConsoles();
    }

    // Support browser back button
    if (pushToHistory) {
        window.history.pushState({ view: viewId }, '', `#${viewId}`);
    }
}
window.showView = showView;

// Handle hardware back button / browser back swipe
window.addEventListener('popstate', (event) => {
    if (event.state && event.state.view) {
        showView(event.state.view, false); // false prevents infinite loop
    } else {
        // Fallback if no state
        showView('view-neev_fln_onboarding', false);
    }
});

// --- App State ---
let activeAssessor = null;
let selectedModule = 'literacy'; // 'literacy' or 'numeracy'
let currentAssessment = null;
let speechEngine = null;

// --- Keypad and Login Logic ---
let enteredPin = "";
let failedAttempts = 0;
let lockoutUntil = 0;
let cachedActiveUserId = null;

function updatePinDots() {
    const dots = document.querySelectorAll('#view-neev_fln_login .pin-dot');
    dots.forEach((dot, i) => {
        if (i < enteredPin.length) {
            dot.className = "pin-dot w-3 h-3 rounded-full border-2 border-white bg-white transition-colors shadow-sm";
        } else {
            dot.className = "pin-dot w-3 h-3 rounded-full border-2 border-white/70 bg-transparent transition-colors shadow-sm";
        }
    });
}

function loadRememberedProfile() {
    const lastId = localStorage.getItem('neev_last_user_id');
    const cardEl = document.getElementById('remember-me-card');
    const inputContainerEl = document.getElementById('userid-input-container');

    if (lastId && cardEl && inputContainerEl) {
        DB.get('assessors', lastId).then(user => {
            if (user) {
                cachedActiveUserId = user.id;
                document.getElementById('remember-name').textContent = user.username || user.id;
                document.getElementById('remember-userid').textContent = `@${user.id}`;
                document.getElementById('remember-avatar').textContent = (user.username || user.id).charAt(0).toUpperCase();
                cardEl.classList.remove('hidden');
                inputContainerEl.classList.add('hidden');
            } else {
                window.switchUserAccount();
            }
        }).catch(() => window.switchUserAccount());
    } else {
        window.switchUserAccount();
    }
}

window.switchUserAccount = function() {
    localStorage.removeItem('neev_last_user_id');
    cachedActiveUserId = null;
    const cardEl = document.getElementById('remember-me-card');
    const inputContainerEl = document.getElementById('userid-input-container');
    if (cardEl) cardEl.classList.add('hidden');
    if (inputContainerEl) inputContainerEl.classList.remove('hidden');
    enteredPin = "";
    updatePinDots();
};

async function verifyLogin() {
    // Check Lockout
    if (Date.now() < lockoutUntil) {
        const remainingSecs = Math.ceil((lockoutUntil - Date.now()) / 1000);
        alert(`Account temporarily locked due to failed PIN attempts. Try again in ${remainingSecs}s.`);
        enteredPin = "";
        updatePinDots();
        return;
    }

    let userId = cachedActiveUserId;
    if (!userId) {
        const inputEl = document.getElementById('user-id-input');
        userId = inputEl ? inputEl.value.trim().toLowerCase() : "";
    }

    if (!userId) {
        alert("Please enter a valid User ID.");
        enteredPin = "";
        updatePinDots();
        return;
    }

    if (enteredPin.length !== 6) {
        alert("Please enter your complete 6-digit PIN.");
        return;
    }

    const user = await DB.get('assessors', userId);
    if (!user) {
        alert(`User ID "${userId}" not found. Please check your credentials.`);
        enteredPin = "";
        updatePinDots();
        return;
    }

    if (user.status === 'deactivated') {
        alert("This account has been deactivated by Super Admin.");
        enteredPin = "";
        updatePinDots();
        return;
    }

    const hashedInput = await CryptoHelper.hashPIN(enteredPin, user.salt);
    if (hashedInput === user.pinHash) {
        // Derive AES key
        CryptoHelper.setActiveSessionKey(await CryptoHelper.deriveKey(enteredPin, user.salt));
        activeAssessor = user;
        localStorage.setItem('neev_last_user_id', user.id);
        failedAttempts = 0;

        enteredPin = "";
        updatePinDots();

        // Mandatory First-Time PIN Setup check
        if (user.mustChangePin) {
            const firstTimeModal = document.getElementById('modal-first-time-pin');
            if (firstTimeModal) firstTimeModal.classList.remove('hidden');
        }

        // Route by User Role
        if (user.role === 'super_admin') {
            showView('view-neev_fln_super_admin_dashboard');
        } else if (user.role === 'school_admin') {
            showView('view-neev_fln_school_admin_dashboard');
        } else if (user.role === 'stakeholder') {
            // Update Stakeholder portal badges
            const nameEl = document.getElementById('stakeholder-user-name');
            const badgeEl = document.getElementById('stakeholder-scope-badge');
            const titleEl = document.getElementById('stakeholder-scope-title');
            if (nameEl) nameEl.textContent = user.username || user.id;
            if (badgeEl) badgeEl.textContent = `Scope: ${(user.scopeLevel || 'Global').toUpperCase()}`;
            if (titleEl) titleEl.textContent = `${(user.scopeLevel || 'Program').toUpperCase()} Level Analytics`;
            showView('view-neev_fln_stakeholder_dashboard');
        } else {
            showView('view-neev_fln_dashboard');
            loadDashboardDropdowns();
        }
    } else {
        failedAttempts++;
        if (failedAttempts >= 5) {
            lockoutUntil = Date.now() + 60000; // 60s cooldown
            alert("Too many incorrect PIN attempts. Locked for 60 seconds.");
        } else {
            alert(`Incorrect 6-Digit PIN. (${5 - failedAttempts} attempts remaining)`);
        }
        enteredPin = "";
        updatePinDots();
    }
}

window.submitFirstTimePinChange = async function(form) {
    const formData = new FormData(form);
    const newPin = (formData.get('newPin') || '').trim();
    const confirmPin = (formData.get('confirmPin') || '').trim();

    if (newPin.length !== 6 || isNaN(newPin)) {
        alert("Please enter a valid 6-digit numerical PIN.");
        return;
    }

    if (newPin !== confirmPin) {
        alert("New PIN and Confirm PIN do not match.");
        return;
    }

    if (activeAssessor) {
        const salt = CryptoHelper.generateSalt();
        const pinHash = await CryptoHelper.hashPIN(newPin, salt);
        activeAssessor.pinHash = pinHash;
        activeAssessor.salt = salt;
        activeAssessor.mustChangePin = false;

        await DB.put('assessors', activeAssessor);
        CryptoHelper.setActiveSessionKey(await CryptoHelper.deriveKey(newPin, salt));

        alert("PIN set successfully! You are now logged in.");
        document.getElementById('modal-first-time-pin').classList.add('hidden');
    }
};

// Global logout function
window.logout = function() {
    activeAssessor = null;
    CryptoHelper.setActiveSessionKey(null);
    enteredPin = "";
    updatePinDots();
    loadRememberedProfile();
    showView('view-neev_fln_login');
};

function setupLoginKeypad() {
    const buttons = document.querySelectorAll('#view-neev_fln_login footer .grid button');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const val = btn.innerText.trim();
            if (val === 'Clear') {
                enteredPin = "";
            } else if (btn.querySelector('span') || val === 'backspace') {
                enteredPin = enteredPin.slice(0, -1);
            } else {
                if (enteredPin.length < 6 && val.length === 1 && !isNaN(val)) {
                    enteredPin += val;
                }
            }
            updatePinDots();

            if (enteredPin.length === 6) {
                setTimeout(() => verifyLogin(), 100);
            }
        });
    });

    // Enter key handling on User ID input to shift focus to PIN entry
    const userIdInput = document.getElementById('user-id-input');
    if (userIdInput) {
        userIdInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                userIdInput.blur();
            }
        });
    }

    // Physical Keyboard Listener for Laptops/Desktops
    window.addEventListener('keydown', (e) => {
        const loginView = document.getElementById('view-neev_fln_login');
        if (!loginView || !loginView.classList.contains('active')) return;

        // Ignore if typing inside the User ID input box (unless hitting Enter)
        if (document.activeElement && document.activeElement.id === 'user-id-input') {
            return;
        }

        if (e.key >= '0' && e.key <= '9') {
            if (enteredPin.length < 6) {
                enteredPin += e.key;
                updatePinDots();
                if (enteredPin.length === 6) {
                    setTimeout(() => verifyLogin(), 100);
                }
            }
        } else if (e.key === 'Backspace') {
            enteredPin = enteredPin.slice(0, -1);
            updatePinDots();
        } else if (e.key === 'Escape' || e.key === 'Delete') {
            enteredPin = "";
            updatePinDots();
        } else if (e.key === 'Enter') {
            if (enteredPin.length === 6) {
                verifyLogin();
            } else {
                alert("Please enter your complete 6-digit PIN.");
            }
        }
    });
}

window.triggerManualLogin = function() {
    if (enteredPin.length === 6) {
        verifyLogin();
    } else {
        alert("Please enter your complete 6-digit PIN.");
    }
};

// --- Localization ---
const translations = {
    'en': {
        'selectAssessor': 'Select Assessor Name',
        'tapToChoose': 'Tap to choose...',
        'clear': 'Clear',
        'logIn': 'Log In',
        'onboarding': 'Onboarding'
    },
    'hi': {
        'selectAssessor': 'मूल्यांकनकर्ता का नाम चुनें',
        'tapToChoose': 'चुनने के लिए टैप करें...',
        'clear': 'साफ़ करें',
        'logIn': 'लॉग इन',
        'onboarding': 'ऑनबोर्डिंग'
    },
    'hi_en': {
        'selectAssessor': 'Assessor Name select karein',
        'tapToChoose': 'Choose karne ke liye tap karein...',
        'clear': 'Clear karein',
        'logIn': 'Log In',
        'onboarding': 'Onboarding'
    }
};

window.switchLanguage = function(lang) {
    if (!translations[lang]) return;
    
    // Update active button state
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => {
        if (btn.dataset.lang === lang) {
            btn.className = 'lang-btn px-4 py-1.5 rounded-full bg-teal-500 text-white text-sm font-medium shadow-sm transition-all';
        } else {
            btn.className = 'lang-btn px-4 py-1.5 rounded-full text-white hover:bg-white/20 text-sm font-medium transition-all';
        }
    });

    // Update text content
    const dict = translations[lang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (dict[key]) {
            el.innerText = dict[key];
        }
    });
};

// --- Onboarding Wireup ---
function setupOnboarding() {
    const cards = document.querySelectorAll('#view-neev_fln_onboarding .onboarding-card');
    cards.forEach(card => {
        card.addEventListener('click', () => {
            showView('view-neev_fln_login');
        });
    });
}

// --- Dashboard &Cascading Dropdowns ---
async function loadDashboardDropdowns() {
    const rawSchools = await DB.getAll('schools');
    const allProjects = await DB.getAll('projects');
    const activeProjectIds = new Set(allProjects.filter(p => p.status !== 'archived').map(p => p.id));
    const schools = rawSchools.filter(s => !s.projectId || activeProjectIds.has(s.projectId));

    const districtSelect = document.getElementById('district');
    const schoolSelect = document.getElementById('school');
    const gradeSelect = document.getElementById('grade');
    const studentSelect = document.getElementById('student');

    if (!districtSelect) return;

    // Helper to safely add options
    const addOption = (selectEl, value, text, isDefault = false) => {
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = text;
        if (isDefault) {
            opt.disabled = true;
            opt.selected = true;
        }
        selectEl.appendChild(opt);
    };

    const resetSelect = (selectEl, defaultText) => {
        selectEl.innerHTML = ''; // safe since it's hardcoded text, or we can use textContent = ''
        selectEl.textContent = '';
        addOption(selectEl, '', defaultText, true);
    };

    // Populate districts
    const districts = [...new Set(schools.map(s => s.district))];
    resetSelect(districtSelect, 'Choose a district...');
    districts.forEach(d => addOption(districtSelect, d, d));

    districtSelect.onchange = () => {
        localStorage.setItem('cachedDistrict', districtSelect.value);
        const filteredSchools = schools.filter(s => s.district === districtSelect.value);
        resetSelect(schoolSelect, 'Choose a school...');
        filteredSchools.forEach(s => addOption(schoolSelect, s.id, s.name));
        resetSelect(gradeSelect, 'Choose a grade...');
        resetSelect(studentSelect, 'Choose a student...');
    };

    schoolSelect.onchange = () => {
        localStorage.setItem('cachedSchool', schoolSelect.value);
        resetSelect(gradeSelect, 'Choose a grade...');
        for (let i = 1; i <= 12; i++) {
            addOption(gradeSelect, i.toString(), `Grade ${i}`);
        }
        resetSelect(studentSelect, 'Choose a student...');
    };

    gradeSelect.onchange = async () => {
        localStorage.setItem('cachedGrade', gradeSelect.value);
        const students = await DB.getByIndex('students', 'schoolId', schoolSelect.value);
        resetSelect(studentSelect, 'Choose a student...');
        
        for (let st of students) {
            if (st.grade === parseInt(gradeSelect.value)) {
                const name = await CryptoHelper.decryptData(st.name);
                addOption(studentSelect, st.id, name);
            }
        }
    };
    
    // Auto-restore cached selections
    const cachedDist = localStorage.getItem('cachedDistrict');
    if (cachedDist && districts.includes(cachedDist)) {
        districtSelect.value = cachedDist;
        districtSelect.onchange();
        setTimeout(() => {
            const cachedSchool = localStorage.getItem('cachedSchool');
            if (cachedSchool) {
                schoolSelect.value = cachedSchool;
                schoolSelect.onchange();
                setTimeout(() => {
                    const cachedGrade = localStorage.getItem('cachedGrade');
                    if (cachedGrade) {
                        gradeSelect.value = cachedGrade;
                        gradeSelect.onchange();
                    }
                }, 10);
            }
        }, 10);
    }
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
    
    // Safely construct HTML instead of using innerHTML
    const h2 = document.createElement('h2');
    h2.className = 'font-title-lg text-title-lg text-on-surface';
    h2.textContent = 'Task 1: Oral Reading Fluency';
    litSection.appendChild(h2);

    const wordsDiv = document.createElement('div');
    wordsDiv.id = 'literacy-words';
    wordsDiv.className = 'bg-surface border border-outline-variant rounded-[24px] p-xl flex flex-wrap gap-2 text-xl leading-loose';
    
    passage.words.forEach((w, i) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'passage-word cursor-pointer px-2 py-1 mx-1 text-2xl rounded transition-colors select-none';
        wordSpan.setAttribute('data-index', i.toString());
        wordSpan.textContent = w;
        wordsDiv.appendChild(wordSpan);
        // add space
        wordsDiv.appendChild(document.createTextNode(' '));
    });
    litSection.appendChild(wordsDiv);

    const micDiv = document.createElement('div');
    micDiv.className = 'flex justify-center gap-md mt-md';
    const micBtnEl = document.createElement('button');
    micBtnEl.id = 'mic-btn';
    micBtnEl.className = 'w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center hover:bg-surface-tint shadow-lg transition-transform active:scale-95';
    
    const micIcon = document.createElement('span');
    micIcon.className = 'material-symbols-outlined';
    micIcon.textContent = 'mic';
    micBtnEl.appendChild(micIcon);
    
    micDiv.appendChild(micBtnEl);
    litSection.appendChild(micDiv);
    main.appendChild(litSection);

    // Bind tap to score listeners on words
    const wordSpans = litSection.querySelectorAll('.passage-word');
    wordSpans.forEach(span => {
        span.onclick = () => {
            const idx = parseInt(span.getAttribute('data-index'));
            const status = literacyState.wordStatuses[idx];
            
            if (navigator.vibrate) navigator.vibrate(50); // Haptic feedback
            
            // Cycle: correct -> incorrect -> skipped -> correct
            if (status === 'correct') {
                literacyState.wordStatuses[idx] = 'incorrect';
                span.className = 'passage-word cursor-pointer px-2 py-1 mx-1 text-2xl word-error select-none';
            } else if (status === 'incorrect') {
                literacyState.wordStatuses[idx] = 'skipped';
                span.className = 'passage-word cursor-pointer px-2 py-1 mx-1 text-2xl word-skipped select-none';
            } else {
                literacyState.wordStatuses[idx] = 'correct';
                span.className = 'passage-word cursor-pointer px-2 py-1 mx-1 text-2xl select-none';
            }
        };
    });

    // Mic recording trigger
    const micBtn = document.getElementById('mic-btn');
    let isRecording = false;
    
    if (micBtn) {
        if (speechEngine) {
            speechEngine.stop(); // Clean up previous instance
        }
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

    // Hydrate local database from live Firestore cloud DB
    try {
        await SyncEngine.pullAllFromFirestore();
    } catch (e) {
        console.warn("Could not hydrate from Firestore cloud DB:", e);
    }

    // Seed Master Super Admin Account if missing (Clean Production State)
    const seedUsers = [
        { id: "superadmin", username: "Super Admin", role: "super_admin" }
    ];

    for (let u of seedUsers) {
        const existing = await DB.get('assessors', u.id);
        if (!existing) {
            const salt = CryptoHelper.generateSalt();
            const pinHash = await CryptoHelper.hashPIN("123456", salt);
            const adminObj = {
                id: u.id,
                username: u.username,
                pinHash: pinHash,
                salt: salt,
                role: u.role,
                status: 'active',
                mustChangePin: false
            };
            await DB.put('assessors', adminObj);
            await SyncEngine.syncRecord('assessors', adminObj);
        }
    }

window.resetToProductionCleanState = async function() {
    if (!confirm("Are you sure you want to reset the database to clean production state? All records in local browser memory AND live Firebase Firestore database will be permanently cleared, leaving only the primary Admin profile.")) {
        return;
    }

    const storesToClear = ['schools', 'students', 'assessments', 'projects', 'funders', 'clusters', 'passages'];
    for (let store of storesToClear) {
        const items = await DB.getAll(store);
        for (let item of items) {
            await DB.delete(store, item.id);
        }
    }

    // Purge non-superadmin users locally
    const users = await DB.getAll('assessors');
    for (let u of users) {
        if (u.id !== 'superadmin') {
            await DB.delete('assessors', u.id);
        }
    }

    // Purge live Firebase Firestore database
    await SyncEngine.purgeFirestore();

    alert("Database successfully reset to clean production state across local memory and live Firestore!");
    if (window.renderSuperAdminDashboardConsoles) window.renderSuperAdminDashboardConsoles();
};

    loadRememberedProfile();

    // Check initial hash location or default to login
    const initialHash = window.location.hash.replace('#', '');
    if (initialHash && views.includes(initialHash)) {
        showView(initialHash, false);
    } else {
        showView('view-neev_fln_login', false);
    }

    setupOnboarding();
    setupLoginKeypad();
    setupDashboard();
}

// Handle Background Sync message from Service Worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', event => {
        if (event.data && event.data.type === 'TRIGGER_SYNC') {
            console.log("Received background sync trigger from SW");
            SyncEngine.syncAll();
        }
    });
}

export { setLanguage, showView, initApp };

// --- Modal Form Handlers (Solid Mobile-First Cards) ---

window.saveFunder = async function(form) {
    const formData = new FormData(form);
    const funderName = (formData.get('funderName') || '').trim();
    if (!funderName) {
        alert("Please enter a valid Funder / Organization Name.");
        return;
    }

    const contactEmail = (formData.get('contactEmail') || '').trim();
    if (contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
        alert("Please enter a valid email address for the primary contact.");
        return;
    }

    const funderId = 'funder_' + funderName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const funderObj = {
        id: funderId,
        name: funderName,
        contactPerson: (formData.get('contactPerson') || '').trim(),
        contactEmail: contactEmail,
        createdAt: new Date().toISOString()
    };

    await DB.put('funders', funderObj);
    await SyncEngine.syncRecord('funders', funderObj);

    alert(`Funder "${funderName}" onboarded successfully!`);
    document.getElementById('modal-onboard-funder').classList.add('hidden');
    form.reset();
    window.renderSuperAdminDashboardConsoles();
};

window.saveProject = async function(form) {
    const formData = new FormData(form);
    const projectName = formData.get('projectName');
    if (!projectName) return;

    const projectId = 'proj_' + projectName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const funderShareElements = form.querySelectorAll('#project-funder-shares > div');
    const funderShares = [];
    let totalShare = 0;

    funderShareElements.forEach(div => {
        const checkbox = div.querySelector('input[type="checkbox"]');
        const shareInput = div.querySelector('input[type="number"]');
        if (checkbox && checkbox.checked) {
            const share = parseInt(shareInput ? shareInput.value : '100', 10) || 0;
            totalShare += share;
            funderShares.push({
                funderId: checkbox.value,
                sharePercent: share
            });
        }
    });

    const allFunders = await DB.getAll('funders');
    if (allFunders.length > 0 && funderShares.length === 0) {
        alert("Please select at least one co-funding donor organization for this project.");
        return;
    }

    if (funderShares.length > 0 && totalShare !== 100) {
        alert(`Total co-funding donor share percentage must equal 100%. Current total: ${totalShare}%`);
        return;
    }

    const projectObj = {
        id: projectId,
        name: projectName,
        targetDistrict: formData.get('targetDistrict') || '',
        funderShares: funderShares,
        funderIds: funderShares.map(fs => fs.funderId),
        startDate: formData.get('startDate') || '',
        endDate: formData.get('endDate') || '',
        status: 'active',
        createdAt: new Date().toISOString()
    };

    await DB.put('projects', projectObj);
    await SyncEngine.syncRecord('projects', projectObj);

    alert(`Project "${projectName}" onboarded successfully!`);
    document.getElementById('modal-onboard-project').classList.add('hidden');
    form.reset();
    window.renderSuperAdminDashboardConsoles();
};

window.openProvisionUserModal = function(funderId) {
    window.openUniversalUserModal(funderId);
};

window.openUniversalUserModal = async function(funderId = null) {
    const teamleadSelect = document.getElementById('user-teamlead-select');
    const funderSelect = document.getElementById('user-funder-select');
    
    if (teamleadSelect) {
        const allUsers = await DB.getAll('assessors');
        const teamleads = allUsers.filter(u => u.role === 'school_admin' && u.status !== 'deactivated');
        teamleadSelect.innerHTML = '<option value="">-- Select Team Leader --</option>' + teamleads.map(tl => `<option value="${tl.id}">${tl.username} (@${tl.id})</option>`).join('');
    }

    if (funderSelect) {
        const allFunders = await DB.getAll('funders');
        funderSelect.innerHTML = '<option value="">-- Select Funder Organization --</option>' + allFunders.map(f => `<option value="${f.id}">${f.name}</option>`).join('');
        if (funderId) funderSelect.value = funderId;
    }

    const modal = document.getElementById('modal-provision-universal-user');
    if (modal) modal.classList.remove('hidden');
};

window.openClusterModal = async function() {
    const clusterTeamleadSelect = document.getElementById('cluster-teamlead-select');
    if (clusterTeamleadSelect) {
        const allUsers = await DB.getAll('assessors');
        const teamleads = allUsers.filter(u => u.role === 'school_admin' && u.status !== 'deactivated');
        clusterTeamleadSelect.innerHTML = '<option value="">-- Select Team Leader --</option>' + teamleads.map(tl => `<option value="${tl.id}">${tl.username} (@${tl.id})</option>`).join('');
    }
    const modal = document.getElementById('modal-onboard-cluster');
    if (modal) modal.classList.remove('hidden');
};

window.handleRoleSelectChange = function(role) {
    const distDiv = document.getElementById('role-field-district');
    const teamDiv = document.getElementById('role-field-teamlead');
    const fundDiv = document.getElementById('role-field-funder');

    if (distDiv) distDiv.classList.toggle('hidden', role !== 'school_admin');
    if (teamDiv) teamDiv.classList.toggle('hidden', role !== 'assessor');
    if (fundDiv) fundDiv.classList.toggle('hidden', role !== 'stakeholder');
};

window.saveUniversalUser = async function(form) {
    const formData = new FormData(form);
    const role = formData.get('role');
    const userId = (formData.get('userId') || '').trim().replace(/^@/, '');
    const username = (formData.get('username') || '').trim();
    const pin = (formData.get('pin') || '123456').trim();

    if (!userId || !username || !pin) {
        alert("Please fill in all required fields.");
        return;
    }

    const salt = CryptoHelper.generateSalt();
    const pinHash = await CryptoHelper.hashPIN(pin, salt);

    const userObj = {
        id: userId,
        username: username,
        pinHash: pinHash,
        salt: salt,
        role: role,
        status: 'active',
        mustChangePin: true, // Flagged for mandatory PIN change on first login
        createdAt: new Date().toISOString()
    };

    if (role === 'school_admin') {
        userObj.district = formData.get('district') || 'Kanpur Nagar';
        userObj.scopeLevel = 'district';
    } else if (role === 'assessor') {
        userObj.teamLeaderId = formData.get('teamLeaderId') || '';
        userObj.scopeLevel = 'school';
    } else if (role === 'stakeholder') {
        userObj.funderId = formData.get('funderId') || '';
        userObj.scopeId = userObj.funderId;
        userObj.scopeLevel = 'program';
    } else {
        userObj.scopeLevel = 'global';
    }

    await DB.put('assessors', userObj);
    await SyncEngine.syncRecord('assessors', userObj);

    alert(`User "@${userId}" (${role}) provisioned successfully with temporary PIN!`);
    document.getElementById('modal-provision-universal-user').classList.add('hidden');
    form.reset();
    window.renderSuperAdminDashboardConsoles();
};

window.saveCluster = async function(form) {
    const formData = new FormData(form);
    const clusterName = (formData.get('clusterName') || '').trim();
    const clusterCode = (formData.get('clusterCode') || '').trim();
    if (!clusterName || !clusterCode) {
        alert("Please provide both Cluster Name and Cluster Code.");
        return;
    }

    const clusterId = 'cls_' + clusterCode.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const existing = await DB.get('clusters', clusterId);
    if (existing) {
        alert(`A cluster with Code "${clusterCode}" already exists (${existing.name}). Please use a unique Cluster Code.`);
        return;
    }

    const clusterObj = {
        id: clusterId,
        name: clusterName,
        code: clusterCode,
        district: formData.get('district') || 'Kanpur Nagar',
        block: formData.get('block') || 'Kalyanpur',
        teamLeaderId: formData.get('teamLeaderId') || '',
        status: 'active',
        createdAt: new Date().toISOString()
    };

    await DB.put('clusters', clusterObj);
    await SyncEngine.syncRecord('clusters', clusterObj);

    alert(`Cluster "${clusterName}" (${clusterCode}) onboarded successfully!`);
    document.getElementById('modal-onboard-cluster').classList.add('hidden');
    form.reset();
    window.renderSuperAdminDashboardConsoles();
};

window.savePassage = async function(form) {
    const formData = new FormData(form);
    const title = (formData.get('title') || '').trim();
    const content = (formData.get('content') || '').trim();
    if (!title || !content) {
        alert("Please provide both Passage Title and Content Text.");
        return;
    }

    const passageId = 'pas_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    
    const compQ = (formData.get('compQuestion') || '').trim();
    const compOptA = (formData.get('compOptA') || '').trim();
    const compOptB = (formData.get('compOptB') || '').trim();
    const compOptC = (formData.get('compOptC') || '').trim();
    const compCorrect = formData.get('compCorrect') || 'A';

    let comprehensionQuestions = [];
    if (compQ) {
        comprehensionQuestions.push({
            question: compQ,
            options: { A: compOptA, B: compOptB, C: compOptC },
            correctOption: compCorrect
        });
    }

    const passageObj = {
        id: passageId,
        title: title,
        language: formData.get('language') || 'Hindi',
        tier: parseInt(formData.get('tier') || '3', 10),
        wordCount: parseInt(formData.get('wordCount') || '60', 10),
        content: content,
        comprehensionQuestions: comprehensionQuestions,
        createdAt: new Date().toISOString()
    };

    await DB.put('passages', passageObj);
    await SyncEngine.syncRecord('passages', passageObj);

    alert(`Reading Passage "${title}" saved successfully!`);
    document.getElementById('modal-manage-passages').classList.add('hidden');
    form.reset();
};

window.resetUserPIN = async function(userId) {
    const newPin = prompt(`Enter new initial 6-digit PIN for @${userId}:`, "123456");
    if (!newPin || newPin.length !== 6) {
        alert("Invalid PIN. Reset cancelled.");
        return;
    }

    const user = await DB.get('assessors', userId);
    if (!user) return;

    const salt = CryptoHelper.generateSalt();
    user.pinHash = await CryptoHelper.hashPIN(newPin, salt);
    user.salt = salt;
    user.mustChangePin = true;

    await DB.put('assessors', user);
    await SyncEngine.syncRecord('assessors', user);
    alert(`PIN for @${userId} reset successfully to ${newPin}. Mandatory PIN change enabled.`);
};

window.toggleUserActiveStatus = async function(userId) {
    const user = await DB.get('assessors', userId);
    if (!user) return;

    const newStatus = user.status === 'deactivated' ? 'active' : 'deactivated';
    user.status = newStatus;
    await DB.put('assessors', user);
    await SyncEngine.syncRecord('assessors', user);

    if (activeAssessor && activeAssessor.id === userId && newStatus === 'deactivated') {
        alert("Your session has been deactivated by Admin.");
        window.logout();
        return;
    }

    alert(`User @${userId} status updated to: ${newStatus.toUpperCase()}`);
    window.renderSuperAdminDashboardConsoles();
};

window.toggleProjectArchive = async function(projectId) {
    const proj = await DB.get('projects', projectId);
    if (!proj) return;

    const newStatus = proj.status === 'archived' ? 'active' : 'archived';
    proj.status = newStatus;
    await DB.put('projects', proj);
    await SyncEngine.syncRecord('projects', proj);

    alert(`Project "${proj.name || projectId}" status updated to: ${newStatus.toUpperCase()}`);
    window.renderSuperAdminDashboardConsoles();
};

// --- Master CSV Exporters ---
window.exportAssessmentLogsCSV = async function() {
    const assessments = await DB.getAll('assessments');
    if (!assessments || assessments.length === 0) {
        alert("No assessment records found to export.");
        return;
    }

    let csvContent = "Assessment ID,Student ID,Project ID,School ID,District,Assessor ID,Subject,Term,Score,WCPM,Accuracy %,Tier,Academic Year,Timestamp\n";

    assessments.forEach(a => {
        csvContent += `"${a.id}","${a.studentId}","${a.projectId || ''}","${a.schoolId || ''}","${a.district || ''}","${a.assessorId || ''}","${a.subject || ''}","${a.term || ''}",${a.score || 0},${a.wcpm || 0},${a.accuracy || 0},"${a.tier || ''}","${a.academicYear || ''}","${a.timestampStart || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neev_fln_assessments_master_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

window.exportSchoolSummariesCSV = async function() {
    const schools = await DB.getAll('schools');
    if (!schools || schools.length === 0) {
        alert("No school records found to export.");
        return;
    }

    let csvContent = "School ID,School Name,Project ID,District,Block,Team Leader ID,Created At\n";

    schools.forEach(s => {
        csvContent += `"${s.id}","${s.name}","${s.projectId || ''}","${s.district || ''}","${s.block || ''}","${s.teamLeaderId || ''}","${s.createdAt || ''}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `neev_fln_schools_master_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// --- Reactive Render Engines for Super Admin Consoles ---
window.renderSuperAdminDashboardConsoles = async function() {
    const usersTable = document.getElementById('superadmin-users-list');
    const clustersTable = document.getElementById('superadmin-clusters-list');
    const projectsTable = document.getElementById('superadmin-projects-list');
    const fundersTable = document.getElementById('superadmin-funders-list');

    if (!usersTable && !projectsTable) return;

    // 1. Render Users Console
    if (usersTable) {
        const users = await DB.getAll('assessors');
        const roleBadges = {
            super_admin: '<span class="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 border border-indigo-200 text-[10px] font-bold">Admin</span>',
            school_admin: '<span class="px-2 py-0.5 rounded bg-teal-100 text-teal-800 border border-teal-200 text-[10px] font-bold">Team Leader</span>',
            assessor: '<span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200 text-[10px] font-bold">Field Assessor</span>',
            stakeholder: '<span class="px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-bold">Stakeholder</span>'
        };

        usersTable.innerHTML = users.map(u => {
            const statusPill = u.status === 'deactivated' 
                ? '<span class="px-2 py-0.5 rounded-full bg-red-100 text-red-800 text-[10px] font-bold">Deactivated</span>'
                : '<span class="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>';
            let scopeText = 'Global';
            if (u.role === 'school_admin') {
                scopeText = u.district || 'District Scope';
            } else if (u.role === 'assessor') {
                scopeText = u.teamLeaderId ? `@${u.teamLeaderId}` : 'Unassigned';
            } else if (u.role === 'stakeholder') {
                scopeText = u.funderId || 'Funder Scope';
            }

            return `<tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 pl-4 font-bold text-slate-800">@${u.id} <span class="font-normal text-slate-500">(${u.username})</span></td>
                <td class="p-3">${roleBadges[u.role] || u.role}</td>
                <td class="p-3 text-slate-600">${scopeText}</td>
                <td class="p-3">${statusPill}</td>
                <td class="p-3 pr-4 text-right space-x-2">
                    <button onclick="window.resetUserPIN('${u.id}')" class="text-indigo-600 hover:text-indigo-800 font-medium">Reset PIN</button>
                    <button onclick="window.toggleUserActiveStatus('${u.id}')" class="text-slate-500 hover:text-slate-800 font-medium">${u.status === 'deactivated' ? 'Activate' : 'Deactivate'}</button>
                </td>
            </tr>`;
        }).join('');
    }

    // 2. Render Clusters Console
    if (clustersTable) {
        const clusters = await DB.getAll('clusters');
        clustersTable.innerHTML = clusters.map(c => `
            <tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 pl-4 font-bold text-slate-800">${c.name} <span class="font-mono text-slate-400 font-normal">(${c.code})</span></td>
                <td class="p-3">${c.district} / ${c.block}</td>
                <td class="p-3 font-medium text-slate-700">@${c.teamLeaderId}</td>
                <td class="p-3"><span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span></td>
                <td class="p-3 pr-4 text-right">
                    <button onclick="alert('Editing Cluster ${c.code}...')" class="text-amber-600 hover:text-amber-800 font-medium">Edit</button>
                </td>
            </tr>
        `).join('');
    }

    // 3. Render Projects Console
    if (projectsTable) {
        const projects = await DB.getAll('projects');
        projectsTable.innerHTML = projects.map(p => {
            const sharesBadges = (p.funderShares || []).map(s => `<span class="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium">${s.funderId} (${s.sharePercent}%)</span>`).join(' ') || '<span class="text-slate-400">100%</span>';
            const statusPill = p.status === 'archived'
                ? '<span class="px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">Archived</span>'
                : '<span class="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">Active</span>';

            return `<tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 pl-4 font-bold text-slate-800">${p.name}</td>
                <td class="p-3">${sharesBadges}</td>
                <td class="p-3">${p.targetDistrict || 'Kanpur Nagar'}</td>
                <td class="p-3">${statusPill}</td>
                <td class="p-3 pr-4 text-right">
                    <button onclick="window.toggleProjectArchive('${p.id}')" class="text-slate-500 hover:text-slate-800 font-medium">${p.status === 'archived' ? 'Unarchive' : 'Archive'}</button>
                </td>
            </tr>`;
        }).join('');
    }

    // 4. Render Funders Console
    if (fundersTable) {
        const funders = await DB.getAll('funders');
        const users = await DB.getAll('assessors');

        fundersTable.innerHTML = funders.map(f => {
            const funderUsers = users.filter(u => u.funderId === f.id);
            const userTags = funderUsers.map(u => `<span class="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200">@${u.id}</span>`).join(' ') || '<span class="text-slate-400 text-xs">No users provisioned</span>';

            return `<tr class="hover:bg-slate-50/80 transition-colors">
                <td class="p-3 pl-4 font-bold text-slate-800">${f.name}</td>
                <td class="p-3">${f.contactPerson || ''} (${f.contactEmail || ''})</td>
                <td class="p-3 flex flex-wrap gap-1">${userTags}</td>
                <td class="p-3 pr-4 text-right">
                    <button onclick="window.openProvisionUserModal('${f.id}')" class="text-indigo-600 hover:text-indigo-800 font-semibold">+ Add User ID</button>
                </td>
            </tr>`;
        }).join('');
    }
};

window.saveSchool = async function(form) {
    const formData = new FormData(form);
    const schoolName = formData.get('schoolName');
    if (!schoolName) return;

    const schoolId = 'sch_' + schoolName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    await DB.put('schools', {
        id: schoolId,
        name: schoolName,
        projectId: formData.get('projectId') || 'proj_utkarsh',
        district: formData.get('district') || 'Kanpur Nagar',
        block: formData.get('block') || 'Kalyanpur',
        teamLeaderId: (activeAssessor && activeAssessor.id) ? activeAssessor.id : 'teamlead',
        createdAt: new Date().toISOString()
    });

    alert(`School "${schoolName}" onboarded successfully!`);
    document.getElementById('modal-onboard-school').classList.add('hidden');
    form.reset();
};

window.saveStudent = async function(form) {
    const formData = new FormData(form);
    const studentName = formData.get('studentName');
    const rollNumber = formData.get('rollNumber');
    if (!studentName || !rollNumber) return;

    const studentId = 'st_' + Date.now().toString().slice(-6);

    let encName = { iv: '', cipher: studentName };
    let encRoll = { iv: '', cipher: rollNumber };

    try {
        encName = await CryptoHelper.encryptData(studentName);
        encRoll = await CryptoHelper.encryptData(rollNumber);
    } catch (e) {
        console.warn("Session key not active, saving plaintext in dev fallback");
    }

    await DB.put('students', {
        id: studentId,
        nameEncrypted: encName,
        rollEncrypted: encRoll,
        projectId: 'proj_utkarsh',
        funderId: formData.get('funderId') || null,
        schoolId: 'sch1',
        district: 'Kanpur Nagar',
        grade: parseInt(formData.get('grade') || '2', 10),
        gender: formData.get('gender') || 'M',
        dob: formData.get('dob') || '',
        motherTongue: formData.get('motherTongue') || 'Hindi',
        academicYear: '2026-27',
        createdAt: new Date().toISOString()
    });

    alert(`Student "${studentName}" onboarded successfully!`);
    document.getElementById('modal-onboard-student').classList.add('hidden');
    form.reset();
};

if (document.readyState === 'loading') {
    document.addEventListener("DOMContentLoaded", () => {
        initApp();
    });
} else {
    initApp();
}
