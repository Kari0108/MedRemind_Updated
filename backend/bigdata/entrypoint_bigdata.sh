#!/bin/bash
set -e

echo "=================================================="
echo " Starting MedRemind+ Big Data Services (HDFS + Hive)"
echo "=================================================="

export HADOOP_HOME=/opt/hadoop
export HADOOP_CONF_DIR=/opt/hadoop/etc/hadoop
export HIVE_HOME=/opt/hive
export HIVE_CONF_DIR=/opt/hive/conf
export PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$HIVE_HOME/bin
export HADOOP_HEAPSIZE=1024

mkdir -p /opt/hadoop/data/dfs/namenode /opt/hadoop/data/dfs/datanode /opt/hadoop/data/tmp
mkdir -p /opt/hive/data /opt/hive/scratch_dir /opt/hive/install_dir

# Format NameNode if not already formatted
if [ ! -d "/opt/hadoop/data/dfs/namenode/current" ]; then
    echo "Formatting HDFS NameNode..."
    hdfs namenode -format -force
fi

echo "Starting HDFS NameNode daemon..."
hdfs --daemon start namenode

echo "Starting HDFS DataNode daemon..."
hdfs --daemon start datanode

# Give NameNode a moment to start
sleep 3

# Wait for HDFS to exit safe mode
echo "Checking HDFS status..."
hdfs dfsadmin -safemode leave || true

# Ensure HDFS standard directories exist
hdfs dfs -mkdir -p /user/hive/warehouse || true
hdfs dfs -chmod -R 777 /user || true
hdfs dfs -mkdir -p /tmp || true
hdfs dfs -chmod -R 777 /tmp || true

# Initialize Hive Metastore schema if not already initialized
if [ ! -d "/opt/hive/data/metastore_db" ]; then
    echo "Initializing Hive Metastore Schema with Derby..."
    cd /opt/hive/data
    schematool -dbType derby -initSchema || true
fi

echo "Starting HiveServer2 on port 10000..."
nohup hive --service hiveserver2 > /opt/hive/hiveserver2.log 2>&1 &

echo "=================================================="
echo " MedRemind+ Big Data services are running!"
echo " HDFS NameNode: http://localhost:9870"
echo " HiveServer2:   port 10000"
echo "=================================================="

# Keep container running and stream logs
exec tail -f /opt/hadoop/logs/*namenode*.log /opt/hive/hiveserver2.log 2>/dev/null
