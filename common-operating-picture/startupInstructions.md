# Installation Guide

Follow these steps to set up the Data Security Platform (DSP) local development environment.

### Prerequisites

Before beginning, ensure your environment meets the following requirements.

1. **Run the Setup Script**
To install necessary dependencies automatically, run the provided script:

```bash
./ubuntu_cop_prereqs_cop.sh

# Reboot after running script for some changes to take effect
reboot
```

   <details>
   <summary><strong>Manual Installation Details (Optional)</strong></summary>

   If you prefer to install manually or need to debug, the script handles the following:

   - **Container Runtime:** Installs Docker + Docker Compose.
     - _Alternatives supported:_ [Colima (recommended)](https://github.com/abiosoft/colima), [Rancher Desktop](https://rancherdesktop.io), or [Podman Desktop](https://podman-desktop.io).
   - **Languages & Tools:**
     - [Node.js (via nvm)](https://nodejs.org/en/download/package-manager)
     - [Go (Golang)](https://go.dev/doc/install)
     - [GEOS](https://libgeos.org/usage/install/)
     - [Make](https://formulae.brew.sh/formula/make)
     </details>
   - **Local DNS Configuration**
     - Entry added into /etc/hosts
     - ```text
       127.0.0.1    local-dsp.virtru.com
       ```

---

### Step 1: Generate Local Certificates (Mkcert)

You need SSL certificates for local development.

**Option A: Script**
Run the key generation script:

```bash
./ubuntu_cop_keys.sh
```

**Option B: Make Command**
** Note: you can use `'make dev-certs'` as a shortcut to generate the development certs **

**Currently NonFunctional - Use the script above**

```bash
# Make command
make dev-certs
```

### Step 2: Unpack the Bundle

Unzip the main bundle and unpack the specific DSP tools. Replace `X.X.X`, `<os>`, and `<arch>` with your specific version and system details.

```bash
# 1. Untar the main bundle
mkdir virtru-dsp-bundle && tar -xvf virtru-dsp-bundle-* -C virtru-dsp-bundle/ && cd virtru-dsp-bundle/

# 2. Unpack DSP Tools
tar -xvf tools/dsp/data-security-platform_X.X.X_<os>_<arch>.tar.gz
  #Example - AMD linux:
  tar -xvf tools/dsp/data-security-platform_2.7.1_linux_amd64.tar.gz

# 3. Unpack and setup Helm
tar -xvf tools/helm/helm-vX.X.X-<os>-<arch>.tar.gz
  #Example - AMD linux:
  tar -xvf tools/helm/helm-v3.15.4-linux-amd64.tar.gz
# Then move command into working directory
mv <os>-<arch>/helm ./helm

# 4. Unpack and setup grpcurl
tar -xvf tools/grpcurl/grpcurl_X.X.X_<os>_<arch>.tar.gz
  #Example - AMD linux:
  tar -xvf tools/grpcurl/grpcurl_1.9.1_linux_x86_64.tar.gz

# Make Executable
chmod +x ./grpcurl
```

### Step 3: Setup Local Docker Registry

The DSP images are stored in the bundle as OCI artifacts. You must spin up a local registry and copy the images into it.

```bash
# 1. Start a local registry instance
docker run -d --restart=always -p 5000:5000 --name registry registry:2

# 2. Copy DSP images into local registry
# (Run this from the virtru-dsp-bundle root directory)
./dsp copy-images --insecure localhost:5000/virtru

# 3. Verify images were copied successfully
curl -X GET http://localhost:5000/v2/_catalog
curl -X GET http://localhost:5000/v2/virtru/data-security-platform/tags/list
```

### Step 4: Build and Run

Use Docker Compose to build and start the environment.

**Start the environment:**

```bash
docker compose --env-file env/default.env -f docker-compose.dev.yaml up --build --force-recreate
```

Local COP Application URL: https://local-dsp.virtru.com:5001/

**Stop the environment:**

The following will stop the enviroment and COP application. Crtl + c in the terminal will also stop the containers however it is recommended
to also run the following down command as it will cleanup the container remnants.

```bash
docker compose --env-file env/default.env -f docker-compose.dev.yaml down
```

### Step 5. Seeding Vehicle Data and Live Data Flow Simulation

Following the successful building of COP:

```bash
# Install the venv module
sudo apt install python3-venv -y

# Create a virtual environment named 'COP_venv' in the current directory
python3 -m venv COP_venv
```

```bash
# Activate the virtual environment.
# Your shell prompt will change to indicate it's active.
source COP_venv/bin/activate
```

```bash
# Pip install all required package from requirements.txt
pip install -r requirements.txt
```

```bash
# Run seeding script to populate database
# 50 is the standard number of objects that the script will inset but is configurable via NUM_RECORDS variable
python3 seed_data.py
```

```bash
# Start simulation
# NUM_ENTITIES will determine how many moving entities the script will query the database for and apply movement logic to
# UPDATE_INTERVAL_SECONDS determins the frequency of movement for each object
# BOUNDING_BOX_PARAMS define the area for the OpenSky query for live planes (smaller box results in less credits used on init).

# For live data from OpenSky Network login to https://opensky-network.org/, download credentials file (credentials.json),
# place the file in the base director (where the sim_data.py script is located) and then run:
python3 sim_data.py

# For a fake simulation that does not require the credentials file or use account credits with OpenSky run this script
# for simulated movement:
python3 sim_data_fake_opensky.py
```

### Troubleshooting & Verification Checklist

If you encounter issues, double-check the following:

- **dsp.yaml:** Ensure this file exists in your working directory.
- **rootCA.cert:** Ensure the root CA certificate was copied correctly during the setup.
- **Permissions:** Verify that the certificates in `dsp-keys` have `chmod 755` permissions.
