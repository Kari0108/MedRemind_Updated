const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { parse } = require('csv-parse/sync');

/**
 * Retrieves relevant medical cases from the Big Data layer (Hive over HDFS).
 * 
 * Target Architecture:
 * - HDFS stores the raw_medical_cases dataset (/medremind/medical_cases/raw/dataset.csv)
 * - Hive provides an external table over HDFS (medremind.raw_medical_cases)
 * - Queries Hive via Beeline JDBC inside the medremind-bigdata Docker container
 * - Gracefully falls back to local CSV parsing if the Docker Big Data service is unavailable
 * 
 * @param {Array<string>} symptoms Array of extracted symptom keywords
 * @returns {Promise<{cases: Array<Object>, source: string, query: string}>}
 */
async function retrieveCasesFromHive(symptoms) {
    if (!symptoms || symptoms.length === 0) {
        return { cases: [], source: 'EMPTY_QUERY', query: '' };
    }

    console.log(`[Big Data Layer] Retrieving cases for symptoms: ${symptoms.join(', ')}`);

    const likeClauses = symptoms.map(s => `text LIKE '%${s.replace(/'/g, "''")}%'`).join(' OR ');
    const hiveQuery = `SELECT id, label, text FROM raw_medical_cases WHERE ${likeClauses} LIMIT 50;`;

    // Attempt 1: Query live Hive inside Docker container
    try {
        console.log(`[Big Data Layer] Querying live Hive on HDFS via Docker container 'medremind-bigdata'...`);
        const beelineCmd = `docker exec medremind-bigdata beeline -u "jdbc:hive2://localhost:10000/medremind" -n root --showHeader=false --outputformat=csv2 -e "${hiveQuery}"`;
        
        const rawOutput = execSync(beelineCmd, { encoding: 'utf-8', timeout: 30000 });

        // Filter out Beeline/SLF4J/JDBC log noise
        const cleanCsv = rawOutput
            .split('\n')
            .map(line => line.trim())
            .filter(line => {
                if (!line) return false;
                if (line.startsWith('SLF4J:') || line.startsWith('Connecting') || line.startsWith('Connected') || 
                    line.startsWith('Driver:') || line.startsWith('Transaction') || line.startsWith('INFO') || 
                    line.startsWith('Beeline') || line.startsWith('Closing:') || line.includes('rows selected')) {
                    return false;
                }
                return true;
            })
            .join('\n');

        if (cleanCsv.trim().length > 0) {
            const records = parse(cleanCsv, {
                columns: ['id', 'label', 'text'],
                skip_empty_lines: true,
                relax_column_count: true,
                relax_quotes: true
            });

            console.log(`[Big Data Layer] Live Hive query successful! Retrieved ${records.length} records from HDFS.`);
            return {
                cases: records,
                source: 'LIVE_HIVE_HDFS',
                query: hiveQuery
            };
        }
    } catch (err) {
        console.warn(`[Big Data Layer] Live Hive query failed or timed out: ${err.message}. Engaging fallback.`);
    }

    // Fallback: Local dataset parsing
    console.log(`[Big Data Layer] Running local CSV fallback repository simulation.`);
    try {
        const datasetPath = path.join(__dirname, '../dataset.csv');
        const fileContent = fs.readFileSync(datasetPath, 'utf-8');
        
        const records = parse(fileContent, {
            columns: true,
            skip_empty_lines: true
        });
        
        const relevantCases = records.filter(row => {
            const textLower = row.text ? row.text.toLowerCase() : '';
            return symptoms.some(symptom => textLower.includes(symptom.toLowerCase()));
        });
        
        console.log(`[Big Data Layer] Fallback retrieved ${relevantCases.length} cases.`);
        return {
            cases: relevantCases,
            source: 'LOCAL_CSV_FALLBACK',
            query: hiveQuery
        };
    } catch (fallbackErr) {
        console.error(`[Big Data Layer] Fallback failed: ${fallbackErr.message}`);
        return {
            cases: [],
            source: 'FAILED',
            query: hiveQuery
        };
    }
}

module.exports = { retrieveCasesFromHive };
