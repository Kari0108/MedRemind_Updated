require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nlp = require('./nlp'); // NLP Module

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

const JWT_SECRET = process.env.JWT_SECRET || 'medremind_super_secret_key_123';

// Initialize SQLite Database
const dbPath = process.env.DOCKER_ENV === 'true' 
    ? '/app/data/medicines.db' 
    : path.join(__dirname, 'medicines.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS medicines (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT NOT NULL,
        dosage TEXT,
        time TEXT NOT NULL,
        description TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => {
        if (!err) {
            db.run(`ALTER TABLE medicines ADD COLUMN user_id INTEGER REFERENCES users(id)`, () => {});
        }
    });

    db.run(`CREATE TABLE IF NOT EXISTS symptom_checks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        symptoms TEXT NOT NULL,
        severity TEXT,
        duration TEXT,
        guidance TEXT NOT NULL,
        nlp_result TEXT,
        FOREIGN KEY(user_id) REFERENCES users(id)
    )`, (err) => {
        if (!err) {
            db.run(`ALTER TABLE symptom_checks ADD COLUMN nlp_result TEXT`, () => {});
        }
    });
}

// Auth Middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// --- AUTH APIs ---

app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required' });

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.run('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', 
            [name, email, hashedPassword], 
            function(err) {
                if (err) {
                    if (err.message.includes('UNIQUE constraint failed')) {
                        return res.status(400).json({ error: 'Email already exists' });
                    }
                    return res.status(500).json({ error: 'Registration failed' });
                }
                const token = jwt.sign({ id: this.lastID, email, name }, JWT_SECRET, { expiresIn: '7d' });
                res.status(201).json({ token, user: { id: this.lastID, name, email } });
            }
        );
    } catch (error) {
        res.status(500).json({ error: 'Server error' });
    }
});

app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

    db.get('SELECT * FROM users WHERE email = ?', [email], async (err, user) => {
        if (err) return res.status(500).json({ error: 'Server error' });
        if (!user) return res.status(401).json({ error: 'Invalid credentials' });

        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '7d' });
        res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
    });
});

app.get('/api/auth/me', authenticateToken, (req, res) => {
    res.json({ user: req.user });
});

// --- MEDICINE APIs ---

app.get('/medicines', authenticateToken, (req, res) => {
    db.all('SELECT * FROM medicines WHERE user_id = ? ORDER BY time ASC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch medicines' });
        res.status(200).json(rows);
    });
});

app.post('/addMedicine', authenticateToken, (req, res) => {
    const { name, dosage, time, description } = req.body;
    if (!name || !time) return res.status(400).json({ error: 'Name and time are required' });

    db.run(
        'INSERT INTO medicines (user_id, name, dosage, time, description) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, name, dosage || '', time, description || ''],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to add medicine' });
            res.status(201).json({ id: this.lastID, message: 'Medicine added successfully' });
        }
    );
});

app.delete('/medicine/:id', authenticateToken, (req, res) => {
    db.run('DELETE FROM medicines WHERE id = ? AND user_id = ?', [req.params.id, req.user.id], function(err) {
        if (err) return res.status(500).json({ error: 'Failed to delete medicine' });
        if (this.changes === 0) return res.status(404).json({ error: 'Medicine not found' });
        res.status(200).json({ message: 'Medicine deleted successfully' });
    });
});

app.put('/medicine/:id', authenticateToken, (req, res) => {
    const { name, dosage, time, description } = req.body;
    if (!name || !time) return res.status(400).json({ error: 'Name and time are required' });

    db.run(
        'UPDATE medicines SET name = ?, dosage = ?, time = ?, description = ? WHERE id = ? AND user_id = ?',
        [name, dosage || '', time, description || '', req.params.id, req.user.id],
        function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update medicine' });
            if (this.changes === 0) return res.status(404).json({ error: 'Medicine not found' });
            res.status(200).json({ message: 'Medicine updated successfully' });
        }
    );
});

// --- AI & HISTORY APIs ---

const medicineExplanations = {
    'aspirin': 'Aspirin is a pain reliever and anti-inflammatory medication. It helps reduce fever, pain, and swelling. It\'s commonly used for headaches, muscle aches, and arthritis.',
    'ibuprofen': 'Ibuprofen is a nonsteroidal anti-inflammatory drug (NSAID). It reduces pain, inflammation, and fever. Commonly used for headaches, toothaches, menstrual cramps, and minor injuries.',
    'paracetamol': 'Paracetamol (acetaminophen) is a pain reliever and fever reducer. It\'s used for mild to moderate pain and fever. Unlike aspirin, it doesn\'t reduce inflammation.',
    'acetaminophen': 'Acetaminophen (paracetamol) is a pain reliever and fever reducer. It\'s used for mild to moderate pain and fever. Unlike aspirin, it doesn\'t reduce inflammation.',
    'amoxicillin': 'Amoxicillin is an antibiotic used to treat bacterial infections. It belongs to the penicillin family and treats ear infections, pneumonia, and other bacterial illnesses.',
    'metformin': 'Metformin is a medication for type 2 diabetes. It helps control blood sugar levels by improving insulin sensitivity and reducing glucose production in the liver.',
    'lisinopril': 'Lisinopril is used to treat high blood pressure and heart failure. It\'s an ACE inhibitor that relaxes blood vessels, making it easier for the heart to pump blood.',
    'atorvastatin': 'Atorvastatin is a cholesterol-lowering medication. It reduces LDL (bad) cholesterol and triglycerides in the blood, helping prevent heart disease and stroke.',
    'omeprazole': 'Omeprazole is used to treat acid reflux and stomach ulcers. It reduces stomach acid production, providing relief from heartburn and indigestion.',
    'vitamin d': 'Vitamin D helps the body absorb calcium and phosphorus for strong bones and teeth. It supports immune function and overall health.',
    'vitamin c': 'Vitamin C is an antioxidant that supports immune function. It helps the body absorb iron and promotes wound healing and skin health.',
    'vitamin b12': 'Vitamin B12 is essential for red blood cell formation and nerve function. It helps prevent anemia and supports brain health.',
    'prednisone': 'Prednisone is a corticosteroid that reduces inflammation and suppresses the immune system. It\'s used to treat allergies, asthma, arthritis, and autoimmune conditions.',
    'warfarin': 'Warfarin is an anticoagulant (blood thinner). It prevents blood clots and is used to treat or prevent stroke, heart attack, and deep vein thrombosis.',
    'insulin': 'Insulin is a hormone that regulates blood sugar levels. It\'s used to treat diabetes by helping the body use glucose for energy.',
    'levothyroxine': 'Levothyroxine is a thyroid hormone replacement. It treats hypothyroidism (underactive thyroid) by restoring normal thyroid hormone levels.',
    'albuterol': 'Albuterol is a bronchodilator used to treat asthma and COPD. It relaxes muscles in the airways, making breathing easier during asthma attacks.',
    'gabapentin': 'Gabapentin is used to treat nerve pain and seizures. It affects neurotransmitters to reduce pain signals and prevent epileptic seizures.',
    'hydrochlorothiazide': 'Hydrochlorothiazide is a diuretic (water pill) that treats high blood pressure and fluid retention. It helps the body eliminate excess salt and water.',
    'furosemide': 'Furosemide is a diuretic that treats fluid retention and high blood pressure. It helps the body eliminate excess fluid through increased urination.'
};

app.get('/explain/:name', authenticateToken, async (req, res) => {
    const medName = req.params.name;
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: [{ role: 'user', content: `Explain the medicine "${medName}" in plain, simple English. Keep it under 3 sentences. Focus on what it is primarily used for.` }]
            })
        });

        const data = await response.json();
        if (response.ok && data.choices?.[0]?.message) {
            res.status(200).json({ explanation: data.choices[0].message.content });
        } else {
            throw new Error('API Error');
        }
    } catch (error) {
        const medNameLower = medName.toLowerCase();
        const fallback = medicineExplanations[medNameLower] || 
            Object.values(medicineExplanations).find(v => v.toLowerCase().includes(medNameLower)) ||
            'Could not fetch explanation at this time.';
        res.status(200).json({ explanation: fallback });
    }
});

app.get('/alternatives/:name', authenticateToken, async (req, res) => {
    const medName = req.params.name;
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'MedRemind'
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: [{ role: 'user', content: `Suggest 3-5 alternative medicines available in India that are similar to "${medName}". Format as a clean numbered list.` }]
            })
        });

        const data = await response.json();
        if (response.ok && data.choices?.[0]?.message) {
            res.status(200).json({ alternatives: data.choices[0].message.content });
        } else {
            throw new Error('API Error');
        }
    } catch (error) {
        res.status(200).json({ alternatives: `1. Generic alternative for ${medName}\n2. Standard formulation of ${medName}\n3. Low-cost substitute for ${medName}` });
    }
});

app.post('/price-comparison', authenticateToken, async (req, res) => {
    const { medicine } = req.body;
    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'http://localhost:3000',
                'X-Title': 'MedRemind'
            },
            body: JSON.stringify({
                model: 'openrouter/free',
                messages: [{ role: 'user', content: `For the medicine "${medicine}", provide practical information about purchasing it in India including price range.` }]
            })
        });

        const data = await response.json();
        if (response.ok && data.choices?.[0]?.message) {
            res.status(200).json({ comparison: data.choices[0].message.content });
        } else {
            throw new Error('API Error');
        }
    } catch (error) {
        res.status(200).json({ comparison: `Price comparison for ${medicine}:\n- **Pharmacy A**: ₹45\n- **Pharmacy B**: ₹50\n- **Generic**: ₹20\n\n*Estimates only.*` });
    }
});

app.post('/symptom-to-medicine', authenticateToken, async (req, res) => {
    const { symptoms, severity, duration, additionalSymptoms } = req.body;
    if (!symptoms) return res.status(400).json({ error: 'Symptoms description is required' });
    
    // Process NLP with safety-aware triage
    const nlpResult = await nlp.processSymptomText(symptoms, severity, duration, additionalSymptoms || []);
    
    // We optionally use the NLP extracted severity/duration if the user didn't explicitly provide it via UI,
    // though the UI currently sends it. For demonstration, we'll store the NLP structure.
    
    const combinedQuery = `Symptoms: ${symptoms}. Severity: ${severity}. Duration: ${duration}.`;
    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const nlpJson = JSON.stringify(nlpResult);
    
    // Use the citizen-friendly preliminary guidance directly
    const guidance = nlpResult.preliminaryGuidance || "Informational guidance only.";
    
    // Save to health history
    db.run('INSERT INTO symptom_checks (user_id, date, symptoms, severity, duration, guidance, nlp_result) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [req.user.id, dateStr, symptoms, severity, duration, guidance, nlpJson], (err) => {
            if (err) console.error('Failed to save symptom check:', err);
        }
    );

    res.status(200).json({ suggestions: guidance, nlp: nlpResult, assessment: nlpResult.structuredAssessment });
});

app.get('/api/history', authenticateToken, (req, res) => {
    db.all('SELECT * FROM symptom_checks WHERE user_id = ? ORDER BY id DESC', [req.user.id], (err, rows) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch history' });
        res.status(200).json(rows);
    });
});

app.post('/api/settings/password', authenticateToken, async (req, res) => {
    const { oldPassword, newPassword } = req.body;
    db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], async (err, user) => {
        if (err || !user) return res.status(500).json({ error: 'Server error' });
        
        const validPassword = await bcrypt.compare(oldPassword, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Incorrect current password' });
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        db.run('UPDATE users SET password_hash = ? WHERE id = ?', [hashedPassword, req.user.id], function(err) {
            if (err) return res.status(500).json({ error: 'Failed to update password' });
            res.json({ message: 'Password updated successfully' });
        });
    });
});

// Front-end Routing (Catch-all for SPA-like behavior if directly accessed)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 MedRemind Backend running on port ${PORT}`));
