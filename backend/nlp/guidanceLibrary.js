/**
 * Structured Guidance Library for MedRemind+
 * 
 * Clinical Reference Standards:
 * - Evidence-based symptom management and triage guidelines derived from WHO and CDC public health guidance.
 * - Organized by symptom group with applicability rules, self-care steps, routine medical consultation timing,
 *   and emergency warning signs.
 * - Strictly non-prescriptive: Does NOT recommend prescription drugs or invent medication dosages.
 */

const GUIDANCE_LIBRARY = [
    {
        id: "EMERGENCY_RED_FLAGS",
        category: "Emergency Warning Signs",
        symptomTags: ["chest pain", "difficulty breathing", "stroke", "slurred speech", "sudden numbness", "seizure", "unconscious", "coughing blood", "vomiting blood", "thunderclap headache"],
        applies: (symptoms, severity, isEmergency) => isEmergency || symptoms.some(s => 
            ["chest pain", "difficulty breathing", "stroke", "slurred speech", "sudden numbness", "seizure", "unconscious", "coughing blood", "vomiting blood", "thunderclap headache"].includes(s)
        ),
        whatYouCanDoNow: [
            "Sit or lie down in a safe, comfortable position while waiting for help.",
            "Loosen any tight clothing around your neck and chest.",
            "Do not attempt to drive yourself to the hospital if you are experiencing severe chest pain, shortness of breath, or neurological symptoms.",
            "Stay calm and have someone remain with you if possible."
        ],
        whenToSeekMedicalHelp: {
            routine: "Not applicable. Immediate medical intervention is required.",
            urgent: "Seek emergency medical evaluation immediately by calling local emergency services (e.g., 112/108/911) or going to the nearest emergency department."
        },
        metadata: {
            source: "WHO & CDC Emergency Triage & Red-Flag Clinical Protocols",
            lastReviewed: "October 2026",
            type: "EMERGENCY_CLINICAL_PROTOCOL"
        }
    },
    {
        id: "RESPIRATORY_FEVER_COUGH",
        category: "Respiratory & Fever Symptoms",
        symptomTags: ["fever", "cough", "runny nose", "sore throat", "chills", "body aches"],
        applies: (symptoms) => symptoms.some(s => ["fever", "cough", "runny nose", "sore throat", "chills", "body aches"].includes(s)),
        whatYouCanDoNow: [
            "Get plenty of rest to support your immune system's recovery.",
            "Stay well-hydrated with water, clear broths, and warm non-caffeinated fluids to soothe throat irritation and replace fluids lost through sweating.",
            "Use warm saline gargles (half a teaspoon of salt in warm water) to relieve sore throat discomfort.",
            "Use a cool-mist humidifier or inhale steam from a warm shower to help ease nasal congestion and loosen cough secretions.",
            "Monitor your temperature twice daily and keep a log of how your symptoms change over time."
        ],
        whenToSeekMedicalHelp: {
            routine: "Consult a healthcare professional if your fever lasts more than 3 consecutive days, if your cough persists beyond 10–14 days, or if your symptoms begin improving but then abruptly worsen.",
            urgent: "Seek immediate urgent care if you develop difficulty breathing, pain or pressure in your chest, persistent inability to drink fluids, confusion, or bluish lips/face."
        },
        metadata: {
            source: "CDC Clinical Guidance for Acute Upper Respiratory Infections",
            lastReviewed: "October 2026",
            type: "PRIMARY_CARE_GUIDANCE"
        }
    },
    {
        id: "HEADACHE_DISCOMFORT",
        category: "Headache & Cranial Discomfort",
        symptomTags: ["headache", "dizziness"],
        applies: (symptoms) => symptoms.some(s => ["headache", "dizziness"].includes(s)),
        whatYouCanDoNow: [
            "Rest in a quiet, dark, and well-ventilated room to reduce sensory stimulation.",
            "Drink 1–2 glasses of water, as mild dehydration is one of the most frequent triggers for non-specific headaches.",
            "Apply a cool or warm compress to your forehead or the back of your neck according to what feels most soothing.",
            "Limit screen time and bright lighting until the headache subsides.",
            "Avoid skipping meals; consume small, balanced snacks if you haven't eaten recently."
        ],
        whenToSeekMedicalHelp: {
            routine: "Schedule a routine medical consultation if your headaches recur frequently (more than twice a week), progressively worsen over several days, or do not respond to rest and hydration.",
            urgent: "Seek immediate emergency medical care if the headache is sudden and explosively severe ('thunderclap'), or is accompanied by high fever with neck stiffness, confusion, visual disturbances, numbness, or difficulty speaking."
        },
        metadata: {
            source: "International Headache Society & WHO Headache Guidance",
            lastReviewed: "October 2026",
            type: "PRIMARY_CARE_GUIDANCE"
        }
    },
    {
        id: "DIGESTIVE_AND_DEHYDRATION",
        category: "Digestive Symptoms & Hydration Management",
        symptomTags: ["stomach ache", "nausea", "vomiting", "diarrhea", "dehydration"],
        applies: (symptoms) => symptoms.some(s => ["stomach ache", "nausea", "vomiting", "diarrhea", "dehydration"].includes(s)),
        whatYouCanDoNow: [
            "Focus on fluid replacement: take small, frequent sips of Oral Rehydration Solution (ORS), coconut water, or clear electrolyte fluids rather than large gulps.",
            "Allow your digestive system to rest during active nausea; resume eating gradually with bland, easily digestible foods (such as rice, toast, crackers, or bananas) once nausea subsides.",
            "Avoid dairy, greasy, high-fat, heavily spiced, or sugary foods and caffeinated beverages until your stomach settles.",
            "Track your hydration status by monitoring urine color (pale yellow indicates adequate hydration; dark amber indicates dehydration) and frequency of urination."
        ],
        whenToSeekMedicalHelp: {
            routine: "Consult a doctor if diarrhea or vomiting persists for more than 48 hours, if you cannot tolerate any solid food after 2 days, or if moderate abdominal pain does not improve.",
            urgent: "Seek immediate medical attention if you show signs of severe dehydration (dry mouth, sunken eyes, severe dizziness on standing, lack of urination for 8+ hours), have severe localized sharp abdominal pain, or notice blood in your vomit or stool."
        },
        metadata: {
            source: "WHO Clinical Guidelines on Acute Gastrointestinal Illness & Dehydration",
            lastReviewed: "October 2026",
            type: "PRIMARY_CARE_GUIDANCE"
        }
    },
    {
        id: "GENERAL_MILD_MONITORING",
        category: "General Symptom Monitoring",
        symptomTags: ["fatigue", "general"],
        applies: () => true, // Fallback default if no specific group matches
        whatYouCanDoNow: [
            "Rest and prioritize 7–9 hours of sleep to give your body time to recuperate.",
            "Stay well-hydrated throughout the day with clean water and herbal teas.",
            "Eat nourishing, balanced meals and avoid strenuous physical exertion until your energy levels recover.",
            "Keep a brief record of when your symptoms started, what makes them better or worse, and whether any new symptoms emerge."
        ],
        whenToSeekMedicalHelp: {
            routine: "Consult a healthcare professional if your symptoms do not improve after several days, interfere with your daily activities, or if you feel uncertain about how you are progressing.",
            urgent: "Seek immediate medical evaluation if you develop severe pain, sudden shortness of breath, high fever, or any unexpected concerning change in your condition."
        },
        metadata: {
            source: "Standard Clinical Practice Protocol for Ambulatory Symptom Monitoring",
            lastReviewed: "October 2026",
            type: "GENERAL_PRACTICE_GUIDANCE"
        }
    }
];

/**
 * Selects the most clinically relevant guidance entries based on extracted symptoms and severity.
 * 
 * @param {Array<string>} symptoms Array of canonical symptom names
 * @param {string} severity 'mild' | 'moderate' | 'severe'
 * @param {boolean} isEmergency Whether red flags were triggered
 * @returns {Object} Structured guidance containing self-care, routine care, and emergency warning thresholds
 */
function getRelevantGuidance(symptoms, severity, isEmergency) {
    if (isEmergency) {
        const emergencyGuidance = GUIDANCE_LIBRARY.find(g => g.id === "EMERGENCY_RED_FLAGS");
        return {
            category: emergencyGuidance.category,
            whatYouCanDoNow: emergencyGuidance.whatYouCanDoNow,
            whenToSeekMedicalHelp: emergencyGuidance.whenToSeekMedicalHelp,
            metadata: emergencyGuidance.metadata
        };
    }

    // Identify all matching specific guidance categories
    const matchingEntries = GUIDANCE_LIBRARY.filter(g => 
        g.id !== "EMERGENCY_RED_FLAGS" && g.id !== "GENERAL_MILD_MONITORING" && g.applies(symptoms, severity, isEmergency)
    );

    if (matchingEntries.length > 0) {
        // Merge recommendations if multiple relevant domains are affected (e.g. respiratory + digestive)
        const primary = matchingEntries[0];
        const combinedSelfCare = [];
        const seenCare = new Set();
        
        matchingEntries.forEach(entry => {
            entry.whatYouCanDoNow.forEach(item => {
                if (!seenCare.has(item)) {
                    seenCare.add(item);
                    combinedSelfCare.push(item);
                }
            });
        });

        return {
            category: matchingEntries.map(e => e.category).join(" & "),
            whatYouCanDoNow: combinedSelfCare.slice(0, 5), // Keep concise (top 4-5 actionable points)
            whenToSeekMedicalHelp: {
                routine: primary.whenToSeekMedicalHelp.routine,
                urgent: primary.whenToSeekMedicalHelp.urgent
            },
            metadata: primary.metadata
        };
    }

    // Default to general monitoring guidance
    const general = GUIDANCE_LIBRARY.find(g => g.id === "GENERAL_MILD_MONITORING");
    return {
        category: general.category,
        whatYouCanDoNow: general.whatYouCanDoNow,
        whenToSeekMedicalHelp: general.whenToSeekMedicalHelp,
        metadata: general.metadata
    };
}

module.exports = {
    GUIDANCE_LIBRARY,
    getRelevantGuidance
};
