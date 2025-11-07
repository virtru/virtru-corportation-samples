# Based on Tim T.'s JRE17 NiFi image
FROM us-east4-docker.pkg.dev/prj-sb-engineering-nerq/fed-sandbox/nifi:1.25.0-jre17-base

WORKDIR /opt/nifi/nifi-current

# Preload any needed files/data
COPY ../extensions extensions
COPY ../custom-libs custom-libs
COPY ../sample_data sample_data
#COPY ../../truststore truststore

ENTRYPOINT ["../scripts/start.sh"]