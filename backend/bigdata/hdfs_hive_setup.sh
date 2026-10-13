#!/bin/bash

# ==========================================
# STEP 3 - HDFS SETUP
# ==========================================
echo "Creating HDFS directories..."
hdfs dfs -mkdir -p /medremind/medical_cases/raw
hdfs dfs -mkdir -p /medremind/medical_cases/processed

# Upload the raw medical-case dataset to HDFS
echo "Uploading dataset to HDFS..."
if [ -f "/app/dataset.csv" ]; then
    hdfs dfs -put -f /app/dataset.csv /medremind/medical_cases/raw/
elif [ -f "../dataset.csv" ]; then
    hdfs dfs -put -f ../dataset.csv /medremind/medical_cases/raw/
fi

# Demonstrate basic HDFS operations
echo "Listing HDFS files:"
hdfs dfs -ls /medremind/medical_cases/raw/

echo "Inspecting file in HDFS:"
hdfs dfs -cat /medremind/medical_cases/raw/dataset.csv | head -n 5

# ==========================================
# STEP 4 - HIVE SETUP
# ==========================================
echo "Executing Hive DDL via Beeline..."

beeline -u "jdbc:hive2://localhost:10000/default" -n root -e "
CREATE DATABASE IF NOT EXISTS medremind;

USE medremind;

DROP TABLE IF EXISTS raw_medical_cases;

CREATE EXTERNAL TABLE raw_medical_cases (
    id STRING,
    label STRING,
    text STRING
)
ROW FORMAT SERDE 'org.apache.hadoop.hive.serde2.OpenCSVSerde'
WITH SERDEPROPERTIES (
   'separatorChar' = ',',
   'quoteChar'     = '\"',
   'escapeChar'    = '\\\\'
)
STORED AS TEXTFILE
LOCATION '/medremind/medical_cases/raw/'
TBLPROPERTIES ('skip.header.line.count'='1');

-- Demonstrate Queries
SELECT id, label, substring(text, 1, 60) AS text_preview FROM raw_medical_cases LIMIT 5;

-- Find cases matching specific symptoms (e.g. skin rash)
SELECT id, label, substring(text, 1, 60) AS text_preview 
FROM raw_medical_cases 
WHERE text LIKE '%rash%' 
LIMIT 5;
"
