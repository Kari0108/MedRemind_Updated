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
   'escapeChar'    = '\\'
)
STORED AS TEXTFILE
LOCATION '/medremind/medical_cases/raw/'
TBLPROPERTIES ('skip.header.line.count'='1');

-- Verify table creation
SHOW TABLES;
