##############################################
# Base image for building the JRE 17 archive 
##############################################
FROM alpine AS builder

# Download JRE 17 archive from Adoptium
ADD https://github.com/adoptium/temurin17-binaries/releases/download/jdk-17.0.12%2B7/OpenJDK17U-jre_aarch64_linux_hotspot_17.0.12_7.tar.gz /jre-17.archive.tar.gz

RUN mkdir -p /opt/jre

# Extract JRE binaries
RUN tar -xzf /jre-17.archive.tar.gz -C /opt/jre

##############################################
# Base image for Apache NiFi
##############################################

FROM cgr.dev/chainguard/apache-nifi

# Copy JRE binaries from the builder stage
COPY --from=builder --chown=nonroot:nonroot /opt/jre /opt/jre

# Verify that we have Java at this location
# RUN ls -l /opt/jre/jdk-17.0.12+7-jre

# Set environment variables
ENV JAVA_HOME=/opt/jre/jdk-17.0.12+7-jre
ENV PATH=$JAVA_HOME/bin:$PATH

# Verify JAVA_HOME and PATH
# RUN echo "JAVA_HOME is set to $JAVA_HOME"
# RUN echo "PATH is set to $PATH"

# Copy your NiFi configuration files (if needed)
# COPY your_nifi_config.xml /opt/nifi/conf/

# CMD ["nifi.server", "run", "-e", "JAVA_HOME='/opt/jre'", "-e", "PATH='$JAVA_HOME/bin:$PATH'"]

# Uncomment the following line to verify that the default Java has been overwritten
# ENTRYPOINT [ "java", "-version"]

ENTRYPOINT ["/usr/share/nifi/scripts/start.sh"]