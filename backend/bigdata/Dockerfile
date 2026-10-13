FROM apache/hive:3.1.3

USER root

# Configure debian archive mirror for security updates and install Python 3 and tools
RUN sed -i 's|http://deb.debian.org/debian-security|http://archive.debian.org/debian-security|g' /etc/apt/sources.list || true \
    && apt-get update -o Acquire::Check-Valid-Until=false \
    && apt-get install -y --no-install-recommends python3 procps curl \
    && rm -rf /var/lib/apt/lists/*

# Copy configuration files
COPY core-site.xml /opt/hadoop/etc/hadoop/core-site.xml
COPY hdfs-site.xml /opt/hadoop/etc/hadoop/hdfs-site.xml
COPY hive-site.xml /opt/hive/conf/hive-site.xml
COPY entrypoint_bigdata.sh /entrypoint_bigdata.sh

RUN chmod +x /entrypoint_bigdata.sh

# Environment variables
ENV HADOOP_HOME=/opt/hadoop
ENV HADOOP_CONF_DIR=/opt/hadoop/etc/hadoop
ENV HIVE_HOME=/opt/hive
ENV HIVE_CONF_DIR=/opt/hive/conf
ENV PATH=$PATH:$HADOOP_HOME/bin:$HADOOP_HOME/sbin:$HIVE_HOME/bin

EXPOSE 9870 9000 10000 10002

ENTRYPOINT ["/entrypoint_bigdata.sh"]
