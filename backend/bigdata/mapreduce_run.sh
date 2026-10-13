#!/bin/bash

# ==========================================
# STEP 5 - MAPREDUCE EXECUTION
# ==========================================

echo "Running MapReduce Symptom Frequency Analysis..."

STREAMING_JAR=$(find /opt/hadoop -name "hadoop-streaming-*.jar" | grep -v "sources" | head -n 1)

echo "Using Hadoop Streaming Jar: $STREAMING_JAR"

hdfs dfs -rm -r -f /medremind/medical_cases/output_symptom_freq

hadoop jar "$STREAMING_JAR" \
  -input /medremind/medical_cases/raw/dataset.csv \
  -output /medremind/medical_cases/output_symptom_freq \
  -mapper "python3 /app/mapper.py" \
  -reducer "python3 /app/reducer.py"

echo "MapReduce finished. Inspecting top symptom frequencies from HDFS:"
hdfs dfs -cat /medremind/medical_cases/output_symptom_freq/part-00000 | sort -k2 -nr | head -n 20
