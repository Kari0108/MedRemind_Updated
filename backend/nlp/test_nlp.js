const nlp = require('./index.js');
const tests = [
    'I have a severe headache and dizziness since yesterday.',
    'I have mild fever for two days.',
    'I am feeling dizzy and nauseous.',
    'I have chest pain.',
    'I have a headache.',
    'The weather is nice today.',
    '',
    '    ',
    '...???!!!',
    'I have headache headache headache',
    'SEVERE HEADACHE',
    'I have back pain', // unknown symptom
    'I have chest pain and nausea', // multiple symptoms
    'chest pain', // missing severity, duration
];

tests.forEach((t, i) => {
    console.log('--- Test ' + (i+1) + ' ---');
    try {
        const res = nlp.processSymptomText(t);
        console.log(JSON.stringify(res, null, 2));
    } catch(e) {
        console.log('CRASH: ' + e.message);
    }
});
