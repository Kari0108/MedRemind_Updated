// NLP Module for MedRemind+
// Implements Preprocessing, Information Extraction, TF-IDF, Cosine Similarity,
// Clinical Triage, Evidence-Based Explanations, and Structured Guidance Integration.

const { getRelevantGuidance } = require('./guidanceLibrary');
const { retrieveCasesFromHive } = require('../bigdata/hive_service');

const STOP_WORDS = new Set([
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours",
    "he", "him", "his", "she", "her", "hers", "it", "its", "they", "them", "their",
    "what", "which", "who", "whom", "this", "that", "these", "those", "am", "is", "are",
    "was", "were", "be", "been", "being", "have", "has", "had", "having", "do", "does",
    "did", "doing", "a", "an", "the", "and", "but", "if", "or", "because", "as", "until",
    "while", "of", "at", "by", "for", "with", "about", "against", "between", "into",
    "through", "during", "before", "after", "above", "below", "to", "from", "up", "down",
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once", "here",
    "there", "when", "where", "why", "how", "all", "any", "both", "each", "few", "more",
    "most", "other", "some", "such", "no", "nor", "not", "only", "own", "same", "so",
    "than", "too", "very", "s", "t", "can", "will", "just", "don", "should", "now",
    "feeling", "feel", "have", "had", "am", "m", "ve", "also", "really", "quite"
]);

const SEVERITY_WORDS = ["mild", "moderate", "severe", "extreme", "intense", "slight", "terrible", "bad"];

// Mapping common variations to canonical symptom names
const SYMPTOM_SYNONYMS = {
    "headache": "headache",
    "headaches": "headache",
    "head ache": "headache",
    "dizzy": "dizziness",
    "dizziness": "dizziness",
    "lightheaded": "dizziness",
    "lightheadedness": "dizziness",
    "nauseous": "nausea",
    "nausea": "nausea",
    "feeling sick": "nausea",
    "vomiting": "vomiting",
    "vomit": "vomiting",
    "threw up": "vomiting",
    "throwing up": "vomiting",
    "fever": "fever",
    "temperature": "fever",
    "high temp": "fever",
    "high fever": "fever",
    "cough": "cough",
    "coughing": "cough",
    "coughed": "cough",
    "bad cough": "cough",
    "chest pain": "chest pain",
    "pain in chest": "chest pain",
    "chest tightness": "chest pain",
    "chest pressure": "chest pain",
    "difficulty breathing": "difficulty breathing",
    "shortness of breath": "difficulty breathing",
    "breathlessness": "difficulty breathing",
    "trouble breathing": "difficulty breathing",
    "choking": "difficulty breathing",
    "struggling to breathe": "difficulty breathing",
    "stomach ache": "stomach ache",
    "stomachache": "stomach ache",
    "belly pain": "stomach ache",
    "abdominal pain": "stomach ache",
    "stomach pain": "stomach ache",
    "cramps in stomach": "stomach ache",
    "tired": "fatigue",
    "fatigue": "fatigue",
    "exhausted": "fatigue",
    "weary": "fatigue",
    "tiredness": "fatigue",
    "runny nose": "runny nose",
    "running nose": "runny nose",
    "blocked nose": "runny nose",
    "stuffy nose": "runny nose",
    "nasal congestion": "runny nose",
    "congestion": "runny nose",
    "sneezing": "runny nose",
    "sore throat": "sore throat",
    "throat pain": "sore throat",
    "scratchy throat": "sore throat",
    "painful throat": "sore throat",
    "chills": "chills",
    "shivering": "chills",
    "cold sweats": "chills",
    "body aches": "body aches",
    "body ache": "body aches",
    "body pain": "body aches",
    "muscle ache": "body aches",
    "muscle pain": "body aches",
    "myalgia": "body aches",
    "aching body": "body aches",
    "diarrhea": "diarrhea",
    "diarrhoea": "diarrhea",
    "loose motion": "diarrhea",
    "loose stools": "diarrhea",
    "watery stools": "diarrhea",
    "dehydration": "dehydration",
    "dry mouth": "dehydration",
    "extreme thirst": "dehydration",
    "excessive thirst": "dehydration",
    "dark urine": "dehydration",
    "less urination": "dehydration"
};

/**
 * Format an array of symptoms into natural, grammatically correct English.
 * e.g. ['fever'] -> "fever"
 *      ['fever', 'cough'] -> "fever and cough"
 *      ['fever', 'cough', 'runny nose'] -> "fever, cough, and runny nose"
 */
function formatSymptomList(symptoms) {
    if (!symptoms || symptoms.length === 0) return "unspecified symptoms";
    const cleaned = symptoms.map(s => s.trim().toLowerCase());
    if (cleaned.length === 1) return cleaned[0];
    if (cleaned.length === 2) return `${cleaned[0]} and ${cleaned[1]}`;
    return `${cleaned.slice(0, -1).join(', ')}, and ${cleaned[cleaned.length - 1]}`;
}

/**
 * Normalize duration phrases into clean, natural English phrases.
 */
function normalizeDuration(rawDuration) {
    if (!rawDuration || typeof rawDuration !== 'string') return "for an unspecified duration";
    const d = rawDuration.trim().toLowerCase();
    
    if (d === 'today' || d === 'since today') return "which started today";
    if (d === 'since yesterday' || d === 'yesterday') return "which began yesterday";
    if (d === 'this morning' || d === 'since this morning') return "which started this morning";
    if (d === 'last night' || d === 'since last night') return "which started last night";
    if (d === 'a few days') return "lasting for several days";
    if (d === 'longer') return "persisting for an extended duration";
    
    // Pattern: "three days", "for three days", "3 days", "for 3 days"
    const daysMatch = d.match(/(?:for\s+)?(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?/i);
    if (daysMatch) return `lasting for ${daysMatch[1]} days`;

    const weeksMatch = d.match(/(?:for\s+)?(\d+|one|two|three|four)\s+weeks?/i);
    if (weeksMatch) return `lasting for ${weeksMatch[1]} weeks`;

    const monthsMatch = d.match(/(?:for\s+)?(\d+|one|two|three)\s+months?/i);
    if (monthsMatch) return `lasting for ${monthsMatch[1]} months`;

    if (d.startsWith('since ')) return `which has been present ${d}`;
    if (d.startsWith('for ')) return `lasting ${d}`;

    return `lasting for ${d}`;
}

/**
 * Check which user symptoms actually overlap with case text in the dataset.
 */
function getConfirmedSymptomOverlap(symptoms, caseTextLower) {
    if (!symptoms || symptoms.length === 0 || !caseTextLower) return [];
    return symptoms.filter(sym => {
        const s = sym.toLowerCase();
        if (s === 'fever') return caseTextLower.includes('fever') || caseTextLower.includes('temperature');
        if (s === 'fatigue') return caseTextLower.includes('fatigue') || caseTextLower.includes('tired') || caseTextLower.includes('exhausted') || caseTextLower.includes('weary');
        if (s === 'difficulty breathing') return caseTextLower.includes('breath') || caseTextLower.includes('breathing') || caseTextLower.includes('choking') || caseTextLower.includes('respiratory');
        if (s === 'headache') return caseTextLower.includes('headache') || caseTextLower.includes('head');
        if (s === 'dizziness') return caseTextLower.includes('dizzy') || caseTextLower.includes('dizziness');
        if (s === 'stomach ache') return caseTextLower.includes('stomach') || caseTextLower.includes('belly') || caseTextLower.includes('abdominal');
        if (s === 'body aches') return caseTextLower.includes('muscle') || caseTextLower.includes('joint') || caseTextLower.includes('body') || caseTextLower.includes('ache');
        if (s === 'runny nose') return caseTextLower.includes('runny') || caseTextLower.includes('nose') || caseTextLower.includes('congestion') || caseTextLower.includes('sneez');
        if (s === 'sore throat') return caseTextLower.includes('throat');
        if (s === 'chills') return caseTextLower.includes('chill') || caseTextLower.includes('shiver');
        if (s === 'diarrhea') return caseTextLower.includes('diarrhea') || caseTextLower.includes('stool');
        if (s === 'dehydration') return caseTextLower.includes('thirst') || caseTextLower.includes('dry') || caseTextLower.includes('urine');
        return caseTextLower.includes(s);
    });
}

// 1. TEXT PREPROCESSING
function preprocess(text) {
    let lower = text.toLowerCase();
    let noPunct = lower.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
    let tokens = noPunct.split(/\s+/).filter(t => t.length > 0);
    let filteredTokens = tokens
        .filter(t => !STOP_WORDS.has(t) && t.length > 0)
        .map(t => SYMPTOM_SYNONYMS[t] || t);
    
    return {
        original: text,
        cleaned: noPunct,
        tokens: filteredTokens
    };
}

// 2. INFORMATION EXTRACTION
function extractInformation(text, tokens) {
    let extractedSymptoms = new Set();
    let severity = "unknown";
    let duration = "unknown";
    
    for (let word of tokens) {
        if (SEVERITY_WORDS.includes(word)) {
            severity = word;
            break;
        }
    }
    
    const durationRegex = /(for (\d+|one|two|three|four|five|six|seven|eight|nine|ten) (days|weeks|months|hours|years)|since (yesterday|this morning|last night|\w+day)|today|since today)/i;
    const durationMatch = text.match(durationRegex);
    if (durationMatch) {
        duration = durationMatch[0].toLowerCase();
    }
    
    let cleanedText = text.toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ");
    
    // Match multi-word and single-word synonyms
    for (let [synonym, canonical] of Object.entries(SYMPTOM_SYNONYMS)) {
        let regex = new RegExp(`\\b${synonym}\\b`, "i");
        if (regex.test(cleanedText)) {
            extractedSymptoms.add(canonical);
        }
    }
    
    return {
        symptoms: Array.from(extractedSymptoms),
        severity: severity,
        duration: duration
    };
}

// 3. TF-IDF REPRESENTATION
function computeTF(tokens) {
    let tf = {};
    let totalTokens = tokens.length;
    if (totalTokens === 0) return tf;
    for (let token of tokens) {
        tf[token] = (tf[token] || 0) + 1;
    }
    for (let token in tf) {
        tf[token] = tf[token] / totalTokens;
    }
    return tf;
}

function computeIDF(corpusTokensList) {
    let idf = {};
    let N = corpusTokensList.length;
    let allTokens = new Set();
    corpusTokensList.forEach(tokens => tokens.forEach(t => allTokens.add(t)));
    
    for (let token of allTokens) {
        let count = 0;
        for (let tokens of corpusTokensList) {
            if (tokens.includes(token)) count++;
        }
        idf[token] = Math.log((N + 1) / (count + 1)) + 1;
    }
    return idf;
}

function computeTFIDF(tf, idf) {
    let tfidf = {};
    for (let token in tf) {
        tfidf[token] = tf[token] * (idf[token] || 0);
    }
    return tfidf;
}

// 4. COSINE SIMILARITY
function cosineSimilarity(vecA, vecB) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    let allKeys = new Set([...Object.keys(vecA), ...Object.keys(vecB)]);
    
    for (let key of allKeys) {
        let valA = vecA[key] || 0;
        let valB = vecB[key] || 0;
        dotProduct += valA * valB;
        normA += valA * valA;
        normB += valB * valB;
    }
    
    if (normA === 0 || normB === 0) return 0;
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Generate contextual follow-up questions and selectable chips.
 */
function generateFollowUpQuestions(currentSymptoms, isEmergency) {
    if (isEmergency) return null; // Suppress during emergencies to keep focus on acute care
    
    const currSet = new Set(currentSymptoms.map(s => s.toLowerCase()));
    
    // Symptom pools by clinical presentation
    const respiratoryPool = [
        { key: "runny nose", label: "Runny or stuffy nose" },
        { key: "sore throat", label: "Sore throat" },
        { key: "chills", label: "Chills or shivering" },
        { key: "body aches", label: "Body aches / muscle pain" },
        { key: "headache", label: "Headache" },
        { key: "fatigue", label: "Fatigue or exhaustion" }
    ];

    const headachePool = [
        { key: "fever", label: "Fever or feeling warm" },
        { key: "dizziness", label: "Dizziness or lightheadedness" },
        { key: "nausea", label: "Nausea or vomiting" },
        { key: "fatigue", label: "Fatigue" },
        { key: "sore throat", label: "Sore throat or cold symptoms" },
        { key: "body aches", label: "Neck or body aches" }
    ];

    const digestivePool = [
        { key: "diarrhea", label: "Frequent loose or watery stools" },
        { key: "dehydration", label: "Dry mouth or extreme thirst" },
        { key: "fever", label: "Fever" },
        { key: "body aches", label: "Body weakness or muscle aches" },
        { key: "dizziness", label: "Dizziness on standing" }
    ];

    const generalPool = [
        { key: "fever", label: "Fever or chills" },
        { key: "cough", label: "Cough" },
        { key: "headache", label: "Headache" },
        { key: "sore throat", label: "Sore throat" },
        { key: "stomach ache", label: "Stomach ache or nausea" },
        { key: "fatigue", label: "Fatigue or body aches" }
    ];

    let selectedPool = generalPool;
    let questionText = "To provide more specific guidance, are you experiencing any of these common symptoms?";

    if (currSet.has("fever") || currSet.has("cough") || currSet.has("sore throat") || currSet.has("runny nose")) {
        selectedPool = respiratoryPool;
        questionText = "To help narrow down possible explanations, are you experiencing any of these related symptoms?";
    } else if (currSet.has("headache") || currSet.has("dizziness")) {
        selectedPool = headachePool;
        questionText = "To better understand your headache or discomfort, do you have any of these additional symptoms?";
    } else if (currSet.has("stomach ache") || currSet.has("nausea") || currSet.has("vomiting") || currSet.has("diarrhea")) {
        selectedPool = digestivePool;
        questionText = "To better evaluate your digestive symptoms, do you have any of the following?";
    }

    // Filter out options the user already has
    const availableOptions = selectedPool.filter(opt => !currSet.has(opt.key));
    if (availableOptions.length === 0) return null;

    return {
        question: questionText,
        options: availableOptions.slice(0, 5) // Offer up to 5 concise choices
    };
}

/**
 * Provides clinical distinguishing factors for conditions present in the dataset.
 */
function getConditionDistinguishingFactors(conditionName, matchedSymptoms) {
    const name = (conditionName || '').trim().toLowerCase();
    const symStr = formatSymptomList(matchedSymptoms);

    if (name.includes('cold') || name.includes('common cold')) {
        return {
            consistentSymptoms: matchedSymptoms,
            distinguishingFactors: `Upper respiratory symptoms (${symStr}) are common in viral rhinitis and upper airway viral infections. A clinical examination, throat swab, or observing whether symptoms resolve within 7–10 days helps distinguish this from bacterial sinusitis, acute pharyngitis, or seasonal allergies.`
        };
    }
    if (name.includes('bronchial asthma') || name.includes('asthma')) {
        return {
            consistentSymptoms: matchedSymptoms,
            distinguishingFactors: `Cough and respiratory symptoms (${symStr}) can occur in reactive airway conditions like asthma. Distinguishing asthma from a viral bronchitis or common cold requires evaluating whether you have wheezing, recurrent nighttime coughing, or triggers like cold air, and having a doctor perform spirometry or a stethoscope exam.`
        };
    }
    if (name.includes('pneumonia')) {
        return {
            consistentSymptoms: matchedSymptoms,
            distinguishingFactors: `Persistent cough and fever (${symStr}) are seen in both bronchitis and lower respiratory infections like pneumonia. Distinguishing pneumonia typically requires a physician's physical exam (listening for crackles or decreased breath sounds) and potentially a chest X-ray.`
        };
    }
    if (name.includes('typhoid') || name.includes('malaria') || name.includes('dengue')) {
        return {
            consistentSymptoms: matchedSymptoms,
            distinguishingFactors: `High fever and constitutional symptoms (${symStr}) are non-specific and overlap broadly across viral and bacterial infections. Distinguishing between viral illnesses, dengue, malaria, or typhoid requires formal blood tests (such as a complete blood count, malaria smear, or serology) and clinical monitoring.`
        };
    }
    if (name.includes('migraine')) {
        return {
            consistentSymptoms: matchedSymptoms,
            distinguishingFactors: `Headache discomfort (${symStr}) is shared among tension headaches, sinus pressure, and migraines. Distinguishing migraines relies on features such as throbbing one-sided pain, sensitivity to light/sound, visual auras, or nausea.`
        };
    }
    if (name.includes('gastroesophageal') || name.includes('peptic ulcer') || name.includes('reflux')) {
        return {
            consistentSymptoms: matchedSymptoms,
            distinguishingFactors: `Stomach discomfort and nausea (${symStr}) can arise from acid-peptic disorders, dietary irritation, or gastroenteritis. Distinguishing these requires evaluating relation to meals, response to antacids, and a clinical history review.`
        };
    }

    return {
        consistentSymptoms: matchedSymptoms,
        distinguishingFactors: `The reported symptoms (${symStr}) are consistent with reference patterns in the educational dataset. A qualified healthcare provider would review your full history and perform a physical exam to distinguish this from alternative conditions.`
    };
}

// 5. MAIN PIPELINE
async function processSymptomText(text, userSeverity = null, userDuration = null, additionalSymptoms = []) {
    // 1. Preprocess
    const preprocessed = preprocess(text);
    
    // 2. Extract Info from text
    const extracted = extractInformation(text, preprocessed.tokens);
    
    // Combine extracted symptoms with user-selected additional symptoms (if any)
    const combinedSymptomSet = new Set(extracted.symptoms);
    if (Array.isArray(additionalSymptoms)) {
        additionalSymptoms.forEach(s => {
            if (s && typeof s === 'string') {
                const canonical = SYMPTOM_SYNONYMS[s.toLowerCase()] || s.toLowerCase().trim();
                combinedSymptomSet.add(canonical);
            }
        });
    }
    const allSymptoms = Array.from(combinedSymptomSet);
    
    // 3. Clinical Emergency Evaluation
    const emergencyPatterns = [
        { regex: /\bchest\s+pain\b/i, name: "chest pain" },
        { regex: /\bpain\s+in\s+chest\b/i, name: "chest pain" },
        { regex: /\bchest\s+pressure\b/i, name: "chest pressure" },
        { regex: /\bchest\s+tightness\b/i, name: "chest tightness" },
        { regex: /\bdifficulty\s+breathing\b/i, name: "difficulty breathing" },
        { regex: /\bshortness\s+of\s+breath\b/i, name: "shortness of breath" },
        { regex: /\bbreathlessness\b/i, name: "shortness of breath" },
        { regex: /\btrouble\s+breathing\b/i, name: "difficulty breathing" },
        { regex: /\bchoking\b/i, name: "acute choking" },
        { regex: /\bstruggling\s+to\s+breathe\b/i, name: "difficulty breathing" },
        { regex: /\brespiratory\s+distress\b/i, name: "respiratory distress" },
        { regex: /\bsudden\s+numbness\b/i, name: "sudden numbness" },
        { regex: /\bone[- ]sided\s+numbness\b/i, name: "one-sided numbness" },
        { regex: /\bfacial\s+droop(ing)?\b/i, name: "facial drooping" },
        { regex: /\bslurred\s+speech\b/i, name: "slurred speech" },
        { regex: /\bstroke\b/i, name: "stroke warning signs" },
        { regex: /\bheart\s+attack\b/i, name: "heart attack warning signs" },
        { regex: /\bunconscious\b/i, name: "loss of consciousness" },
        { regex: /\bloss\s+of\s+consciousness\b/i, name: "loss of consciousness" },
        { regex: /\bfaint(ing|ed)?\b/i, name: "fainting" },
        { regex: /\bpassed\s+out\b/i, name: "loss of consciousness" },
        { regex: /\bseizure(s)?\b/i, name: "seizure" },
        { regex: /\bconvulsion(s)?\b/i, name: "convulsions" },
        { regex: /\bcoughing\s+blood\b/i, name: "coughing blood" },
        { regex: /\bvomiting\s+blood\b/i, name: "vomiting blood" },
        { regex: /\bthunderclap\s+headache\b/i, name: "sudden explosive headache" },
        { regex: /\bsudden\s+severe\s+headache\b/i, name: "sudden severe headache" }
    ];

    let redFlagTrigger = null;
    for (let ep of emergencyPatterns) {
        if (ep.regex.test(text)) {
            redFlagTrigger = ep.name;
            break;
        }
    }

    const rawUserSeverity = (userSeverity || '').toString().toLowerCase().trim();
    const userSelectedSevere = rawUserSeverity === 'severe';
    const isEmergency = Boolean(redFlagTrigger) || userSelectedSevere;

    // Severity Resolution
    let effectiveSeverity = "mild";
    if (userSelectedSevere || redFlagTrigger) {
        effectiveSeverity = "severe";
    } else if (rawUserSeverity === 'moderate' || extracted.severity === 'moderate' || extracted.severity === 'bad') {
        effectiveSeverity = "moderate";
    } else {
        effectiveSeverity = "mild";
    }

    // Duration Resolution & Normalization
    const rawDuration = (userDuration && userDuration.toString().trim().length > 0) ? userDuration : extracted.duration;
    const normalizedDurationText = normalizeDuration(rawDuration);

    // 4. Big Data Retrieval (Hive over HDFS)
    const retrievalResult = await retrieveCasesFromHive(allSymptoms);
    let retrievedCases = Array.isArray(retrievalResult) ? retrievalResult : (retrievalResult.cases || []);
    const retrievalSource = retrievalResult.source || 'UNKNOWN';
    const retrievalQuery = retrievalResult.query || '';

    if (retrievedCases.length === 0) {
        retrievedCases = [
            { id: "fallback_1", label: "Unknown", text: "No relevant medical cases found for these symptoms in the Big Data repository." }
        ];
    }

    // 5. TF-IDF & Cosine Similarity on Sub-Corpus
    const corpusTokens = retrievedCases.map(c => preprocess(c.text).tokens);
    const corpusIDF = computeIDF(corpusTokens);
    
    // Vectorize user input (including any newly selected follow-up symptoms)
    const userCombinedTokens = [...preprocessed.tokens, ...allSymptoms];
    const userTF = computeTF(userCombinedTokens);
    const tfidfVector = computeTFIDF(userTF, corpusIDF);

    let bestMatch = null;
    let maxSimilarity = -1;
    let bestConfirmedOverlap = [];

    for (let mCase of retrievedCases) {
        let caseTokens = preprocess(mCase.text).tokens;
        let caseTF = computeTF(caseTokens);
        let caseTFIDF = computeTFIDF(caseTF, corpusIDF);
        let sim = cosineSimilarity(tfidfVector, caseTFIDF);
        
        const caseTextLower = (mCase.text || '').toLowerCase();
        const overlap = getConfirmedSymptomOverlap(allSymptoms, caseTextLower);

        const isBetter = (!bestMatch) ||
            (overlap.length > bestConfirmedOverlap.length && sim >= 0.20) ||
            (overlap.length === bestConfirmedOverlap.length && sim > maxSimilarity);

        if (isBetter) {
            maxSimilarity = sim;
            bestMatch = mCase;
            bestConfirmedOverlap = overlap;
        }
    }

    const validSimilarity = parseFloat(Math.max(maxSimilarity, 0).toFixed(4));

    // 6. Evidence-Based Plausible Explanations Evaluation
    let hasMeaningfulOverlap = false;
    if (!isEmergency && bestMatch && bestMatch.id !== "fallback_1" && bestMatch.label && bestMatch.label !== "Unknown" && allSymptoms.length > 0) {
        if (allSymptoms.length === 1) {
            hasMeaningfulOverlap = (bestConfirmedOverlap.length === 1);
        } else if (allSymptoms.length >= 2) {
            const overlapRatio = bestConfirmedOverlap.length / allSymptoms.length;
            hasMeaningfulOverlap = (bestConfirmedOverlap.length >= 2 && overlapRatio >= 0.70);
        }
    }

    // A condition is ONLY presented when evidence is sufficient and similarity >= 0.30
    const hasRelevantMatch = !isEmergency && hasMeaningfulOverlap && validSimilarity >= 0.30;
    
    const possibleExplanations = [];
    let insufficientEvidenceReason = null;

    if (hasRelevantMatch && bestMatch && bestMatch.label) {
        const details = getConditionDistinguishingFactors(bestMatch.label, bestConfirmedOverlap);
        possibleExplanations.push({
            name: bestMatch.label,
            consistentSymptoms: details.consistentSymptoms,
            distinguishingFactors: details.distinguishingFactors,
            explanation: `The reference dataset includes medical cases documenting ${formatSymptomList(details.consistentSymptoms)} under this condition.`
        });
    } else if (!isEmergency) {
        if (allSymptoms.length === 0) {
            insufficientEvidenceReason = "You described feeling unwell without mentioning specific distinct symptoms. Additional details are needed to provide relevant possibilities.";
        } else if (allSymptoms.length === 1) {
            insufficientEvidenceReason = `A single symptom such as ${allSymptoms[0]} can be associated with many different common conditions (ranging from benign temporary fatigue or mild viral irritation to tension). There is not yet enough specific evidence to narrow down a probable explanation.`;
        } else {
            insufficientEvidenceReason = `The reported combination of symptoms does not provide enough distinctive clinical evidence to point to a specific condition pattern in the dataset. A healthcare provider can perform an in-person assessment to evaluate potential causes.`;
        }
    }

    // 7. Structured Clinical Guidance from Library
    const guidance = getRelevantGuidance(allSymptoms, effectiveSeverity, isEmergency);

    // 8. Grammatical Summary & Severity Evaluation
    const symptomsGrammar = formatSymptomList(allSymptoms);
    let naturalSummary = "";
    
    if (allSymptoms.length === 0) {
        naturalSummary = `You reported feeling unwell without specific distinct symptoms, ${normalizedDurationText}.`;
    } else {
        naturalSummary = `You reported experiencing ${symptomsGrammar}, ${normalizedDurationText}.`;
    }

    let severityExplanation = "";
    if (redFlagTrigger && rawUserSeverity === 'mild') {
        severityExplanation = `You selected mild severity, but your description includes "${redFlagTrigger}", which is a clinical red-flag symptom requiring urgent evaluation regardless of perceived mildness.`;
    } else if (redFlagTrigger && rawUserSeverity === 'moderate') {
        severityExplanation = `You selected moderate severity, but symptoms such as "${redFlagTrigger}" indicate potential urgent warning signs that require emergency clinical evaluation.`;
    } else if (isEmergency) {
        severityExplanation = `Your reported symptoms include potential emergency warning signs that require immediate clinical evaluation.`;
    } else if (effectiveSeverity === 'moderate') {
        severityExplanation = `Your symptoms are currently evaluated as moderate. While not an emergency, persistent symptoms should be evaluated by a healthcare professional if they do not improve.`;
    } else {
        severityExplanation = `Your symptoms appear mild. Mild symptoms can often be monitored while supporting your recovery with rest and hydration.`;
    }

    // 9. Follow-Up Questions (for interactive refinement)
    const followUp = generateFollowUpQuestions(allSymptoms, isEmergency);

    // 10. Formulate Legacy-Compatible Fields & Guidance String
    let conditionName = possibleExplanations.length > 0 ? possibleExplanations[0].name : null;
    let conditionExplanation = possibleExplanations.length > 0 
        ? possibleExplanations[0].distinguishingFactors 
        : (insufficientEvidenceReason || "We could not find a sufficiently relevant match. Please consult a healthcare professional for an assessment.");

    let nextStepText = isEmergency
        ? guidance.whenToSeekMedicalHelp.urgent
        : (effectiveSeverity === 'moderate'
            ? "Please consult a qualified doctor or healthcare professional for a medical assessment if symptoms persist. If you develop emergency warning signs such as chest pain or difficulty breathing, seek urgent care immediately."
            : "Rest, stay hydrated, and monitor your symptoms. If they worsen, fail to improve after several days, or you develop severe discomfort, consult a healthcare professional.");

    let plainGuidance = `**Your symptom assessment**\n\n${naturalSummary} ${severityExplanation}\n\n`;
    if (!isEmergency) {
        if (hasRelevantMatch) {
            plainGuidance += `**Possible related condition: ${conditionName}**\n\n${conditionExplanation}\n\n`;
        } else {
            plainGuidance += `**Possible related condition**\n\n${conditionExplanation}\n\n`;
        }
    }
    plainGuidance += `**What you can do now**\n\n${guidance.whatYouCanDoNow.join('\n- ')}\n\n`;
    plainGuidance += `**When to seek medical help**\n\n${nextStepText}`;

    const structuredAssessment = {
        isEmergency: isEmergency,
        summary: naturalSummary,
        severityEvaluation: {
            selectedSeverity: rawUserSeverity || "not specified",
            effectiveSeverity: effectiveSeverity,
            explanation: severityExplanation,
            hasSafetyOverride: Boolean(redFlagTrigger && rawUserSeverity !== 'severe')
        },
        normalizedDuration: normalizedDurationText,
        hasRelevantMatch: hasRelevantMatch,
        possibleExplanations: possibleExplanations,
        insufficientEvidenceReason: insufficientEvidenceReason,
        whatYouCanDoNow: guidance.whatYouCanDoNow,
        whenToSeekMedicalHelp: {
            routine: guidance.whenToSeekMedicalHelp.routine,
            urgent: guidance.whenToSeekMedicalHelp.urgent
        },
        followUp: followUp,
        guidanceMetadata: guidance.metadata,
        // Backward-compatibility keys
        assessment: `${naturalSummary} ${severityExplanation}`,
        conditionName: conditionName,
        conditionExplanation: conditionExplanation,
        nextStep: nextStepText
    };

    return {
        input: text,
        processedText: preprocessed.cleaned,
        preprocessedTokens: preprocessed.tokens,
        extractedSymptoms: allSymptoms,
        severity: effectiveSeverity,
        duration: rawDuration,
        tfidf: tfidfVector,
        retrievalSource: retrievalSource,
        retrievalQuery: retrievalQuery,
        retrievedCaseCount: retrievedCases.length === 1 && retrievedCases[0].id === "fallback_1" ? 0 : retrievedCases.length,
        topCaseMatch: bestMatch ? bestMatch.id : null,
        topCaseLabel: bestMatch ? bestMatch.label : null,
        topCaseText: bestMatch ? bestMatch.text : null,
        similarityScore: validSimilarity,
        similarityMetric: "Cosine similarity of TF-IDF text vectors (academic similarity score, not diagnostic confidence)",
        matchedCaseType: "Academic reference dataset match (not a clinical diagnosis)",
        safetyNotice: "MedRemind+ is an educational project, not a diagnostic tool. For medical advice, consult a qualified healthcare professional.",
        preliminaryGuidance: plainGuidance,
        structuredAssessment: structuredAssessment
    };
}

module.exports = {
    processSymptomText,
    preprocess,
    extractInformation,
    computeTF,
    computeIDF,
    computeTFIDF,
    cosineSimilarity,
    normalizeDuration,
    formatSymptomList,
    generateFollowUpQuestions
};
