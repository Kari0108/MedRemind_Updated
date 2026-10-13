const fs = require('fs');

const token = fs.readFileSync('G:/MedRemind/med-remind/backend/token.txt', 'utf8').trim();
const API_URL = 'http://localhost:3000';

async function runScenario(name, payload) {
    console.log(`\n==================================================`);
    console.log(`TEST SCENARIO: ${name}`);
    console.log(`Payload:`, JSON.stringify(payload));
    console.log(`--------------------------------------------------`);

    const res = await fetch(`${API_URL}/symptom-to-medicine`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify(payload)
    });

    if (!res.ok) {
        console.error(`ERROR: HTTP ${res.status}`);
        const errText = await res.text();
        console.error(errText);
        return { status: res.status, error: errText };
    }

    const data = await res.json();
    const a = data.assessment;

    console.log(`1. Summary:`, a.summary);
    console.log(`2. Severity Evaluation:`, JSON.stringify(a.severityEvaluation));
    console.log(`3. Duration (Normalized):`, a.normalizedDuration);
    console.log(`4. Is Emergency:`, a.isEmergency);
    console.log(`5. Has Relevant Match:`, a.hasRelevantMatch);
    console.log(`6. Possible Explanations:`, JSON.stringify(a.possibleExplanations, null, 2));
    if (!a.hasRelevantMatch && !a.isEmergency) {
        console.log(`   Insufficient Evidence Reason:`, a.insufficientEvidenceReason);
    }
    console.log(`7. What You Can Do Now (${a.whatYouCanDoNow?.length || 0} items):`);
    (a.whatYouCanDoNow || []).forEach(it => console.log(`   - ${it}`));
    console.log(`8. When to Seek Medical Help:`);
    console.log(`   Routine:`, a.whenToSeekMedicalHelp?.routine);
    console.log(`   Urgent:`, a.whenToSeekMedicalHelp?.urgent);
    if (a.followUp) {
        console.log(`9. Follow-Up Question:`, a.followUp.question);
        console.log(`   Options (${a.followUp.options?.length || 0}):`, a.followUp.options.map(o => o.label).join(' | '));
    } else {
        console.log(`9. Follow-Up Question: None (Suppressed or completed)`);
    }

    return { status: res.status, data };
}

async function runAllTests() {
    console.log('STARTING SYMPTOM ASSESSMENT VERIFICATION SUITE');

    // Scenario 1: Mild fever and cough since yesterday
    await runScenario('1. Mild fever and cough since yesterday', {
        symptoms: 'I have a fever and cough since yesterday',
        severity: 'Mild',
        duration: 'Since yesterday'
    });

    // Scenario 2: Fever and cough with runny nose and sore throat (Follow-up refinement scenario)
    await runScenario('2. Fever and cough with runny nose and sore throat', {
        symptoms: 'I have a fever and cough',
        severity: 'Moderate',
        duration: 'A few days',
        additionalSymptoms: ['runny nose', 'sore throat']
    });

    // Scenario 3: Cough with body aches and chills
    await runScenario('3. Cough with body aches and chills', {
        symptoms: 'I have a cough with severe body aches and chills',
        severity: 'Moderate',
        duration: 'For three days'
    });

    // Scenario 4: Headache without enough information to suggest a cause
    await runScenario('4. Headache without enough information', {
        symptoms: 'I have a headache',
        severity: 'Mild',
        duration: 'Today'
    });

    // Scenario 5: Digestive symptoms with possible dehydration concerns
    await runScenario('5. Digestive symptoms with dehydration concerns', {
        symptoms: 'I have a stomach ache with nausea and dry mouth',
        severity: 'Moderate',
        duration: 'Since yesterday'
    });

    // Scenario 6: An unclear or unrelated input
    await runScenario('6. Unclear or unrelated input', {
        symptoms: 'I am feeling unusual and dont know why',
        severity: 'Mild',
        duration: 'Today'
    });

    // Scenario 7: Severe chest pain or difficulty breathing (Emergency red flag)
    await runScenario('7. Severe chest pain or difficulty breathing', {
        symptoms: 'I have severe chest pain and difficulty breathing',
        severity: 'Severe',
        duration: 'Today'
    });

    // Scenario 7b: Safety override check (User selects Mild, but reports chest pain)
    await runScenario('7b. Safety Override: User selected Mild with chest pain', {
        symptoms: 'I have a mild chest pain and difficulty breathing',
        severity: 'Mild',
        duration: 'Today'
    });

    // Scenario 8: Missing or invalid severity/duration values
    await runScenario('8. Missing or invalid severity/duration values', {
        symptoms: 'I have a cough and sore throat',
        severity: null,
        duration: undefined
    });

    console.log(`\n==================================================`);
    console.log('ALL SCENARIOS COMPLETED');
}

runAllTests();
