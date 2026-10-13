const API_URL = 'http://localhost:3000';
let currentUser = null;
let currentToken = localStorage.getItem('medremind_token');
let medicinesData = [];

// --- VIEW MANAGEMENT ---

function initApp() {
    if (currentToken) {
        // Verify token and fetch user
        fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${currentToken}` }
        })
        .then(res => {
            if (res.ok) return res.json();
            throw new Error('Invalid token');
        })
        .then(data => {
            currentUser = data.user;
            showView('app-view');
            initDashboard();
        })
        .catch(err => {
            logout(false);
        });
    } else {
        // No token, show public view
        if(window.location.hash === '#login') {
            showView('auth-view', 'login');
        } else if (window.location.hash === '#register') {
            showView('auth-view', 'register');
        } else {
            showView('public-view');
        }
    }
}

function showView(viewId, mode = null) {
    document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active', 'hidden'));
    document.querySelectorAll('.view-section').forEach(v => {
        if(v.id !== viewId) v.classList.add('hidden');
    });
    
    document.getElementById(viewId).classList.remove('hidden');
    document.getElementById(viewId).classList.add('active');

    if (viewId === 'auth-view') {
        toggleAuthForm(mode || 'login');
    }
}

// --- AUTHENTICATION ---

function toggleAuthForm(mode) {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    document.getElementById('login-error').classList.add('hidden');
    document.getElementById('register-error').classList.add('hidden');

    if (mode === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        window.history.replaceState(null, null, '#login');
    } else {
        registerForm.classList.remove('hidden');
        loginForm.classList.add('hidden');
        window.history.replaceState(null, null, '#register');
    }
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const errorDiv = document.getElementById('login-error');
    
    try {
        const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            loginSuccess(data.token, data.user);
        } else {
            errorDiv.textContent = data.error || 'Login failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        errorDiv.textContent = 'Server error. Please try again.';
        errorDiv.classList.remove('hidden');
    }
});

document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirm = document.getElementById('register-password-confirm').value;
    const errorDiv = document.getElementById('register-error');
    
    if (password !== confirm) {
        errorDiv.textContent = 'Passwords do not match';
        errorDiv.classList.remove('hidden');
        return;
    }

    try {
        const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            localStorage.setItem('medremind_token', data.token);
            currentToken = data.token;
            currentUser = data.user;
            
            // Show Onboarding
            document.getElementById('onboarding-name').textContent = name;
            showView('onboarding-view');
        } else {
            errorDiv.textContent = data.error || 'Registration failed';
            errorDiv.classList.remove('hidden');
        }
    } catch (err) {
        errorDiv.textContent = 'Server error. Please try again.';
        errorDiv.classList.remove('hidden');
    }
});

function completeOnboarding() {
    showView('app-view');
    initDashboard();
}

function loginSuccess(token, user) {
    localStorage.setItem('medremind_token', token);
    currentToken = token;
    currentUser = user;
    window.history.replaceState(null, null, '#dashboard');
    showView('app-view');
    initDashboard();
}

function logout(showMsg = true) {
    localStorage.removeItem('medremind_token');
    currentToken = null;
    currentUser = null;
    window.history.replaceState(null, null, ' ');
    showView('public-view');
    if (showMsg) showToast('Logged out successfully');
}

// --- DASHBOARD AND NAVIGATION ---

function initDashboard() {
    // Set user profile details
    const initial = currentUser.name.charAt(0).toUpperCase();
    document.getElementById('nav-avatar').textContent = initial;
    document.getElementById('nav-username').textContent = currentUser.name;
    document.getElementById('dashboard-greeting').textContent = `Good morning, ${currentUser.name.split(' ')[0]}`;
    document.getElementById('setting-name').textContent = currentUser.name;
    document.getElementById('setting-email').textContent = currentUser.email;

    // Load data
    fetchMedicines();
    fetchHistory();
    navigateTo('home-section');
    updateClock();
    setInterval(updateClock, 60000);
}

const authHeaders = () => ({
    'Authorization': `Bearer ${currentToken}`,
    'Content-Type': 'application/json'
});

function navigateTo(sectionId) {
    if (!currentToken) {
        logout(false);
        return;
    }
    
    // Update active nav
    document.querySelectorAll('.sidebar-nav li, .mobile-nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll(`[data-target="${sectionId}"]`).forEach(el => el.classList.add('active'));

    // Update view
    document.querySelectorAll('.app-page-section').forEach(el => {
        el.classList.remove('active');
        el.classList.add('hidden');
    });
    const target = document.getElementById(sectionId);
    if(target) {
        target.classList.remove('hidden');
        target.classList.add('active');
    }
}

document.querySelectorAll('.sidebar-nav li, .settings-link').forEach(link => {
    link.addEventListener('click', function() {
        const target = this.getAttribute('data-target');
        if (target) navigateTo(target);
    });
});

// --- MEDICINES ---

async function fetchMedicines() {
    try {
        const res = await fetch(`${API_URL}/medicines`, { headers: authHeaders() });
        if (!res.ok) throw new Error('Auth failed');
        const data = await res.json();
        medicinesData = data;
        renderMedicines(data);
        renderHomePreviews(data);
        renderReminders(data);
    } catch (e) {
        console.error(e);
        if (e.message === 'Auth failed') logout(false);
    }
}

function renderMedicines(medicines) {
    const list = document.getElementById('medicine-list');
    const empty = document.getElementById('empty-state');
    list.innerHTML = '';
    
    if (medicines.length === 0) {
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        medicines.forEach(med => {
            const row = document.createElement('div');
            row.className = 'med-row';
            row.innerHTML = `
                <div class="med-info">
                    <h3 class="med-name">${med.name}</h3>
                    <p class="med-desc-text">${med.description || 'No special instructions'}</p>
                </div>
                <div class="med-dosage-col">${med.dosage || '-'}</div>
                <div class="med-time-col">
                    <svg width="14" height="14" style="vertical-align:-2px; margin-right:4px;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                    ${med.time}
                </div>
                <div class="med-actions">
                    <button class="med-action-link" onclick="explainMedicine('${med.name}')">Info</button>
                    <button class="med-action-link" onclick="getAlternatives('${med.name}')">Alternatives</button>
                    <button class="med-action-link" onclick="getPrice('${med.name}')">Price</button>
                    <button class="med-action-link" onclick="editMedicine(${med.id})">Edit</button>
                    <button class="med-action-link" style="color:#d9534f;" onclick="deleteMedicine(${med.id})">Delete</button>
                </div>
            `;
            list.appendChild(row);
        });
    }
}

function renderHomePreviews(medicines) {
    const medPreview = document.getElementById('home-medicines-preview');
    const remPreview = document.getElementById('home-reminders-preview');
    const medFooter = document.getElementById('home-medicines-footer');
    const remFooter = document.getElementById('home-reminders-footer');
    
    medPreview.innerHTML = '';
    remPreview.innerHTML = '';
    
    if (medicines.length === 0) {
        medPreview.innerHTML = '<p class="text-muted" style="padding:1rem 0;">No medicines scheduled.</p>';
        remPreview.innerHTML = '<p class="text-muted" style="padding:1rem 0;">You have no reminders today.</p>';
        medFooter.style.display = 'none';
        remFooter.style.display = 'none';
    } else {
        // Take top 3 for preview
        medicines.slice(0, 3).forEach(med => {
            medPreview.innerHTML += `
                <div class="compact-list-item">
                    <div>
                        <div class="item-title">${med.name}</div>
                        <div class="item-meta">${med.dosage || '-'}</div>
                    </div>
                </div>
            `;
            remPreview.innerHTML += `
                <div class="compact-list-item">
                    <div>
                        <div class="item-title">${med.name}</div>
                        <div class="item-meta">${med.dosage || '-'}</div>
                    </div>
                    <div style="color:var(--teal); font-weight:500;">${med.time}</div>
                </div>
            `;
        });
        medFooter.style.display = 'block';
        remFooter.style.display = 'block';
    }
}

function renderReminders(medicines) {
    const timeline = document.getElementById('reminders-timeline');
    timeline.innerHTML = '';
    
    if (medicines.length === 0) {
        timeline.innerHTML = '<div class="empty-state">No reminders scheduled for today.</div>';
    } else {
        // Sort by time
        const sorted = [...medicines].sort((a,b) => a.time.localeCompare(b.time));
        sorted.forEach(med => {
            timeline.innerHTML += `
                <div class="timeline-item">
                    <div class="timeline-time">${med.time}</div>
                    <div class="timeline-content">
                        <div>
                            <div style="font-weight:500;">${med.name}</div>
                            <div style="font-size:0.9rem; opacity:0.7;">${med.dosage || ''}</div>
                        </div>
                    </div>
                </div>
            `;
        });
    }
}

// --- MEDICINE ACTIONS ---

function openAddMedModal() {
    document.getElementById('med-form').reset();
    document.getElementById('med-id').value = '';
    document.getElementById('med-modal-title').textContent = 'Add Medicine';
    document.getElementById('med-modal').classList.remove('hidden');
}

function closeMedModal() {
    document.getElementById('med-modal').classList.add('hidden');
}

document.getElementById('med-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('med-id').value;
    const name = document.getElementById('med-name').value;
    const dosage = document.getElementById('med-dosage').value;
    const time = document.getElementById('med-time').value;
    const description = document.getElementById('med-desc').value;
    
    const url = id ? `${API_URL}/medicine/${id}` : `${API_URL}/addMedicine`;
    const method = id ? 'PUT' : 'POST';
    
    try {
        const res = await fetch(url, {
            method,
            headers: authHeaders(),
            body: JSON.stringify({ name, dosage, time, description })
        });
        
        if (res.ok) {
            showToast(id ? 'Medicine updated' : 'Medicine added');
            closeMedModal();
            fetchMedicines();
        } else {
            showToast('Failed to save medicine', true);
        }
    } catch (e) {
        showToast('Server error', true);
    }
});

function editMedicine(id) {
    const med = medicinesData.find(m => m.id === id);
    if (!med) return;
    
    document.getElementById('med-id').value = med.id;
    document.getElementById('med-name').value = med.name;
    document.getElementById('med-dosage').value = med.dosage;
    document.getElementById('med-time').value = med.time;
    document.getElementById('med-desc').value = med.description;
    
    document.getElementById('med-modal-title').textContent = 'Edit Medicine';
    document.getElementById('med-modal').classList.remove('hidden');
}

async function deleteMedicine(id) {
    if (!confirm('Are you sure you want to delete this medicine?')) return;
    try {
        const res = await fetch(`${API_URL}/medicine/${id}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        if (res.ok) {
            showToast('Medicine deleted');
            fetchMedicines();
        } else {
            showToast('Failed to delete', true);
        }
    } catch (e) {
        showToast('Server error', true);
    }
}

// --- OPENROUTER AI MODALS ---

function closeInfoModal() {
    document.getElementById('info-modal').classList.add('hidden');
}

async function showInfoModal(title, endpoint, body = null) {
    document.getElementById('info-title').textContent = title;
    document.getElementById('info-text').classList.add('hidden');
    document.getElementById('info-spinner').classList.remove('hidden');
    document.getElementById('info-modal').classList.remove('hidden');
    
    try {
        const options = {
            method: body ? 'POST' : 'GET',
            headers: authHeaders()
        };
        if (body) options.body = JSON.stringify(body);
        
        const res = await fetch(`${API_URL}${endpoint}`, options);
        const data = await res.json();
        
        document.getElementById('info-spinner').classList.add('hidden');
        document.getElementById('info-text').classList.remove('hidden');
        
        if (res.ok) {
            const content = data.explanation || data.alternatives || data.comparison;
            document.getElementById('info-text').innerHTML = marked.parse(content);
        } else {
            document.getElementById('info-text').textContent = 'Sorry, we could not load this information.';
        }
    } catch (e) {
        document.getElementById('info-spinner').classList.add('hidden');
        document.getElementById('info-text').classList.remove('hidden');
        document.getElementById('info-text').textContent = 'A network error occurred.';
    }
}

function explainMedicine(name) { showInfoModal(`${name} Information`, `/explain/${name}`); }
function getAlternatives(name) { showInfoModal(`Alternatives for ${name}`, `/alternatives/${name}`); }
function getPrice(name) { showInfoModal(`Pricing for ${name}`, `/price-comparison`, { medicine: name }); }

// --- SYMPTOMS ---

const chips = document.querySelectorAll('.chip');
chips.forEach(chip => {
    chip.addEventListener('click', (e) => {
        const group = e.target.closest('.chip-group');
        group.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.target.classList.add('active');
    });
});

let currentSymptomState = {
    text: "",
    severity: "Mild",
    duration: "Today",
    selectedFollowUps: new Set()
};

async function submitSymptomCheck(isFollowUp = false) {
    const input = currentSymptomState.text;
    const severity = currentSymptomState.severity;
    const duration = currentSymptomState.duration;
    const additionalSymptoms = Array.from(currentSymptomState.selectedFollowUps);

    document.getElementById('ai-modal').classList.remove('hidden');
    document.getElementById('modal-spinner').classList.remove('hidden');
    document.getElementById('modal-content').classList.add('hidden');
    
    try {
        const res = await fetch(`${API_URL}/symptom-to-medicine`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ 
                symptoms: input, 
                severity, 
                duration,
                additionalSymptoms
            })
        });
        
        const data = await res.json();
        
        document.getElementById('modal-spinner').classList.add('hidden');
        document.getElementById('modal-content').classList.remove('hidden');
        
        if (res.ok) {
            let extractedSymptoms = input;
            let extractedSeverity = severity || "Not specified";
            let extractedDuration = duration || "Not specified";
            
            if (data.nlp) {
                extractedSymptoms = data.nlp.extractedSymptoms && data.nlp.extractedSymptoms.length > 0 
                    ? data.nlp.extractedSymptoms.join(', ') 
                    : input;
                extractedSeverity = data.nlp.severity !== 'unknown' ? data.nlp.severity : extractedSeverity;
                extractedDuration = data.nlp.duration !== 'unknown' ? data.nlp.duration : extractedDuration;
            }
            
            if (data.assessment && data.assessment.normalizedDuration) {
                extractedDuration = data.assessment.normalizedDuration;
            }
            
            document.getElementById('result-symptoms').innerHTML = `<strong>Symptoms:</strong> ${escapeHtml(extractedSymptoms)}`;
            document.getElementById('result-severity').innerHTML = `<strong>Severity:</strong> ${escapeHtml(extractedSeverity)}`;
            document.getElementById('result-duration').innerHTML = `<strong>Duration:</strong> ${escapeHtml(extractedDuration)}`;
            
            const assessmentData = data.assessment || (data.nlp && data.nlp.structuredAssessment);
            renderAssessmentCards('modal-result-cards', assessmentData, true);
            
            // Refresh history in background
            fetchHistory();
        } else {
            document.getElementById('modal-result-cards').innerHTML = '<p class="error-msg">Could not generate guidance. Please try again.</p>';
        }
    } catch (e) {
        document.getElementById('modal-spinner').classList.add('hidden');
        document.getElementById('modal-content').classList.remove('hidden');
        document.getElementById('modal-result-cards').innerHTML = '<p class="error-msg">Network error occurred.</p>';
    }
}

document.getElementById('symptom-btn').addEventListener('click', async () => {
    const input = document.getElementById('symptom-input').value.trim();
    if (!input) return showToast('Please describe your symptoms', true);
    
    const severityChip = document.querySelector('#severity-chips .active');
    const durationChip = document.querySelector('#duration-chips .active');
    
    currentSymptomState.text = input;
    currentSymptomState.severity = severityChip ? severityChip.getAttribute('data-value') : 'Mild';
    currentSymptomState.duration = durationChip ? durationChip.getAttribute('data-value') : 'Today';
    currentSymptomState.selectedFollowUps = new Set();
    
    await submitSymptomCheck(false);
});

function closeAiModal() {
    document.getElementById('ai-modal').classList.add('hidden');
    // Retain input so user can review or edit if desired
}

// --- HISTORY ---

async function fetchHistory() {
    try {
        const res = await fetch(`${API_URL}/api/history`, { headers: authHeaders() });
        if (res.ok) {
            const data = await res.json();
            renderHistory(data);
        }
    } catch (e) {
        console.error('Failed to fetch history', e);
    }
}

function renderHistory(history) {
    const list = document.getElementById('history-list');
    const empty = document.getElementById('history-empty');
    list.innerHTML = '';
    
    if (history.length === 0) {
        empty.classList.remove('hidden');
    } else {
        empty.classList.add('hidden');
        history.forEach(item => {
            const row = document.createElement('div');
            row.className = 'history-item';
            
            // Limit symptoms preview string
            const shortSymptoms = item.symptoms.length > 50 ? item.symptoms.substring(0, 50) + '...' : item.symptoms;
            
            row.innerHTML = `
                <div class="hist-date">${item.date}</div>
                <div class="hist-content">
                    <div class="hist-title">Symptom Check</div>
                    <div class="hist-meta">${shortSymptoms} · ${item.severity}</div>
                </div>
                <div style="color:var(--teal)">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </div>
            `;
            
            row.addEventListener('click', () => {
                document.getElementById('hist-modal-date').textContent = item.date;
                document.getElementById('hist-modal-symptoms').innerHTML = `<strong>Symptoms:</strong> ${escapeHtml(item.symptoms)}`;
                document.getElementById('hist-modal-severity').innerHTML = `<strong>Severity:</strong> ${escapeHtml(item.severity)}`;
                document.getElementById('hist-modal-duration').innerHTML = `<strong>Duration:</strong> ${escapeHtml(item.duration)}`;
                
                let histAssessment = null;
                if (item.nlp_result) {
                    try {
                        const parsedNlp = typeof item.nlp_result === 'string' ? JSON.parse(item.nlp_result) : item.nlp_result;
                        if (parsedNlp && parsedNlp.structuredAssessment) {
                            histAssessment = parsedNlp.structuredAssessment;
                        } else if (parsedNlp) {
                            const isEmerg = (item.severity && item.severity.toLowerCase() === 'severe');
                            const hasRel = !!(parsedNlp.topCaseLabel && parsedNlp.topCaseLabel !== 'Unknown' && parsedNlp.similarityScore >= 0.35);
                            histAssessment = {
                                isEmergency: isEmerg,
                                assessment: `Reported symptoms: ${item.symptoms} (${item.severity || 'Unspecified'} severity, duration: ${item.duration || 'Not specified'}).`,
                                hasRelevantMatch: hasRel,
                                conditionName: hasRel ? parsedNlp.topCaseLabel : '',
                                conditionExplanation: hasRel ? 'This reference was identified from the educational dataset based on reported symptoms. This is not a diagnosis.' : 'We could not find a sufficiently relevant match. Please consult a healthcare professional for an assessment.',
                                nextStep: isEmerg ? 'Please seek urgent medical evaluation from an emergency room or a qualified medical doctor immediately.' : 'Monitor your symptoms and consult a healthcare professional if they do not improve.'
                            };
                        }
                    } catch (e) {
                        console.error('Error parsing nlp_result for history item', e);
                    }
                }
                
                if (!histAssessment) {
                    const isEmerg = (item.severity && item.severity.toLowerCase() === 'severe');
                    histAssessment = {
                        isEmergency: isEmerg,
                        assessment: `Reported symptoms: ${item.symptoms}`,
                        hasRelevantMatch: false,
                        conditionName: '',
                        conditionExplanation: 'We could not find a sufficiently relevant match. Please consult a healthcare professional for an assessment.',
                        nextStep: isEmerg ? 'Please seek urgent medical evaluation immediately.' : 'Monitor your symptoms and consult a healthcare professional if they do not improve.'
                    };
                }
                
                renderAssessmentCards('hist-modal-result-cards', histAssessment);
                document.getElementById('history-modal').classList.remove('hidden');
            });
            
            list.appendChild(row);
        });
    }
}

// --- SETTINGS ---

document.getElementById('password-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldPassword = document.getElementById('old-password').value;
    const newPassword = document.getElementById('new-password').value;
    
    try {
        const res = await fetch(`${API_URL}/api/settings/password`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ oldPassword, newPassword })
        });
        
        const data = await res.json();
        
        if (res.ok) {
            showToast('Password updated');
            document.getElementById('password-form').reset();
            document.getElementById('password-form').classList.add('hidden');
        } else {
            showToast(data.error || 'Failed to update', true);
        }
    } catch (e) {
        showToast('Server error', true);
    }
});

// --- CLOCK AND SOUND ---

let isSoundEnabled = false;
const soundBtn = document.getElementById('sound-btn');
const toggleSoundSetting = document.getElementById('setting-sound-toggle');

function toggleSound(enable) {
    isSoundEnabled = enable;
    toggleSoundSetting.checked = enable;
    if (enable) {
        soundBtn.textContent = 'Sound: On';
        soundBtn.classList.remove('sound-off');
        soundBtn.classList.add('sound-on');
    } else {
        soundBtn.textContent = 'Sound: Off';
        soundBtn.classList.remove('sound-on');
        soundBtn.classList.add('sound-off');
    }
}

soundBtn.addEventListener('click', () => toggleSound(!isSoundEnabled));
toggleSoundSetting.addEventListener('change', (e) => toggleSound(e.target.checked));

function updateClock() {
    if(!document.getElementById('live-clock')) return;
    const now = new Date();
    const timeString = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
    document.getElementById('live-clock').textContent = timeString;
    
    // Check reminders
    if (isSoundEnabled) {
        medicinesData.forEach(med => {
            if (med.time === timeString && now.getSeconds() === 0) {
                document.getElementById('alert-sound').play();
                showToast(`Time to take: ${med.name}`);
            }
        });
    }
}

// --- UTILS ---

function showToast(msg, isError = false) {
    const toast = document.getElementById('notification-toast');
    document.getElementById('toast-msg').textContent = msg;
    toast.style.backgroundColor = isError ? '#d9534f' : 'var(--navy)';
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('hidden'), 3000);
}

// Initialize application on load
window.onload = initApp;

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function renderAssessmentCards(containerId, assessment, isInteractive = false) {
    const container = document.getElementById(containerId);
    if (!container) return;
    if (!assessment) {
        container.innerHTML = '<p class="error-msg">No assessment data available.</p>';
        return;
    }

    const isEmergency = assessment.isEmergency || false;
    const summaryText = assessment.summary || assessment.assessment || "Your reported symptoms have been recorded.";
    const severityEval = assessment.severityEvaluation || null;
    const hasMatch = assessment.hasRelevantMatch || false;
    const possibleExplanations = assessment.possibleExplanations || [];
    const conditionName = assessment.conditionName || "";
    const conditionExplanation = assessment.conditionExplanation || "";
    const insufficientReason = assessment.insufficientEvidenceReason || "";
    const whatYouCanDoNow = Array.isArray(assessment.whatYouCanDoNow) ? assessment.whatYouCanDoNow : [assessment.nextStep || 'Rest, stay hydrated, and monitor your symptoms.'];
    const whenToSeekHelp = assessment.whenToSeekMedicalHelp || {
        routine: "Consult a healthcare professional if symptoms do not improve over several days.",
        urgent: assessment.nextStep || "Seek urgent emergency medical care immediately."
    };
    const followUp = assessment.followUp || null;

    // --- Section 1: Your Symptom Assessment ---
    const card1Class = isEmergency ? 'result-card card-emergency' : 'result-card';
    let severityBlockHtml = '';
    if (severityEval) {
        if (severityEval.hasSafetyOverride) {
            severityBlockHtml = `
                <div class="severity-override-note">
                    <strong>⚠️ Clinical Safety Notice:</strong> ${escapeHtml(severityEval.explanation)}
                </div>
            `;
        } else if (severityEval.explanation) {
            severityBlockHtml = `
                <div style="margin-top: 0.6rem; color: #475569; font-size: 0.95rem; line-height: 1.45;">
                    ${escapeHtml(severityEval.explanation)}
                </div>
            `;
        }
    }

    const card1Html = `
        <div class="${card1Class}">
            <div class="card-label">Your Symptom Assessment</div>
            <div class="card-body-text">
                <p style="margin: 0; font-weight: 500; font-size: 1.05rem;">${escapeHtml(summaryText)}</p>
                ${severityBlockHtml}
            </div>
        </div>
    `;

    // --- Section 2: Possible Explanations (suppressed during emergencies) ---
    let card2Html = '';
    if (!isEmergency) {
        if (hasMatch && possibleExplanations.length > 0) {
            const listHtml = possibleExplanations.map(p => `
                <div class="possibility-item">
                    <div class="possibility-header">
                        <span class="possibility-title">${escapeHtml(p.name)}</span>
                    </div>
                    <div class="possibility-symptoms">
                        <strong>Reported symptoms consistent with this:</strong> ${escapeHtml(Array.isArray(p.consistentSymptoms) ? p.consistentSymptoms.join(', ') : p.consistentSymptoms)}
                    </div>
                    <div class="possibility-factors">
                        <strong>Clinical context:</strong> ${escapeHtml(p.distinguishingFactors)}
                    </div>
                </div>
            `).join('');

            card2Html = `
                <div class="result-card">
                    <div class="card-label">Possible Explanations</div>
                    <div class="card-body-text">
                        ${listHtml}
                        <p style="font-size: 0.8rem; color: #64748B; margin-top: 0.65rem; margin-bottom: 0;">
                            *Possible explanations are educational references from medical case patterns, not a confirmed medical diagnosis.*
                        </p>
                    </div>
                </div>
            `;
        } else if (hasMatch && conditionName) {
            card2Html = `
                <div class="result-card">
                    <div class="card-label">Possible Explanations</div>
                    <div class="card-body-text">
                        <div class="possibility-item">
                            <div class="possibility-title">${escapeHtml(conditionName)}</div>
                            <div class="possibility-factors">${escapeHtml(conditionExplanation)}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            const reasonText = insufficientReason || "There is not enough specific symptom evidence to narrow down a probable condition. A healthcare professional can perform an in-person assessment.";
            card2Html = `
                <div class="result-card">
                    <div class="card-label">Possible Explanations</div>
                    <div class="card-body-text" style="color: #475569; line-height: 1.5;">
                        <p style="margin: 0 0 0.5rem 0;">${escapeHtml(reasonText)}</p>
                    </div>
                </div>
            `;
        }
    }

    // --- Section 3: What You Can Do Now ---
    const careItemsHtml = whatYouCanDoNow.map(item => `<li>${escapeHtml(item)}</li>`).join('');
    const card3Html = `
        <div class="result-card card-action">
            <div class="card-label">What You Can Do Now</div>
            <div class="card-body-text">
                <ul class="guidance-list">
                    ${careItemsHtml}
                </ul>
            </div>
        </div>
    `;

    // --- Section 4: When to Seek Medical Help ---
    let card4Html = '';
    if (isEmergency) {
        card4Html = `
            <div class="result-card card-emergency-action">
                <div class="card-label" style="color: #B91C1C;">When to Seek Medical Help</div>
                <div class="card-body-text">
                    <div class="help-subblock urgent-subblock">
                        <strong>🚨 Immediate Action Required:</strong>
                        <p style="margin: 0.35rem 0 0 0; font-size: 1.05rem;">${escapeHtml(whenToSeekHelp.urgent)}</p>
                    </div>
                </div>
            </div>
        `;
    } else {
        card4Html = `
            <div class="result-card">
                <div class="card-label">When to Seek Medical Help</div>
                <div class="card-body-text">
                    <div class="medical-help-block">
                        <div class="help-subblock">
                            <strong>When to schedule a routine appointment:</strong>
                            <p style="margin: 0; color: #334155;">${escapeHtml(whenToSeekHelp.routine)}</p>
                        </div>
                        <div class="help-subblock urgent-subblock">
                            <strong>Seek urgent care if you experience:</strong>
                            <p style="margin: 0; color: #991B1B;">${escapeHtml(whenToSeekHelp.urgent)}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // --- Section 5: Interactive Follow-Up Questions ---
    let card5Html = '';
    if (isInteractive && followUp && !isEmergency && followUp.options && followUp.options.length > 0) {
        const chipsHtml = followUp.options.map(opt => {
            const isSel = currentSymptomState.selectedFollowUps.has(opt.key);
            return `
                <button type="button" class="followup-chip ${isSel ? 'selected' : ''}" data-key="${escapeHtml(opt.key)}">
                    <span class="chip-icon">${isSel ? '✓' : '+'}</span>
                    <span>${escapeHtml(opt.label)}</span>
                </button>
            `;
        }).join('');

        card5Html = `
            <div class="followup-card" id="followup-container">
                <div class="followup-title">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:middle; margin-right:4px;">
                        <circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    ${escapeHtml(followUp.question)}
                </div>
                <div class="followup-chips-container" id="followup-chips-box">
                    ${chipsHtml}
                </div>
                <div class="followup-actions">
                    <button type="button" class="btn-refine" id="btn-refine-action">Update Assessment</button>
                    <button type="button" class="btn-skip" id="btn-skip-action">No Other Symptoms</button>
                </div>
            </div>
        `;
    }

    container.innerHTML = card1Html + card2Html + card3Html + card4Html + card5Html;

    // Attach listeners if interactive follow-up is rendered
    if (isInteractive && followUp && !isEmergency) {
        const chips = container.querySelectorAll('.followup-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                const target = e.currentTarget;
                const key = target.getAttribute('data-key');
                if (currentSymptomState.selectedFollowUps.has(key)) {
                    currentSymptomState.selectedFollowUps.delete(key);
                    target.classList.remove('selected');
                    const icon = target.querySelector('.chip-icon');
                    if (icon) icon.textContent = '+';
                } else {
                    currentSymptomState.selectedFollowUps.add(key);
                    target.classList.add('selected');
                    const icon = target.querySelector('.chip-icon');
                    if (icon) icon.textContent = '✓';
                }
            });
        });

        const refineBtn = container.querySelector('#btn-refine-action');
        if (refineBtn) {
            refineBtn.addEventListener('click', async () => {
                await submitSymptomCheck(true);
            });
        }

        const skipBtn = container.querySelector('#btn-skip-action');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => {
                const box = container.querySelector('#followup-container');
                if (box) {
                    box.innerHTML = `
                        <div style="font-size: 0.9rem; color: #475569; display: flex; align-items: center; gap: 0.5rem;">
                            <span style="color: var(--teal); font-weight: bold;">✓</span>
                            <span>Assessment complete with your reported symptoms. Please follow the guidance above.</span>
                        </div>
                    `;
                }
            });
        }
    }
}
