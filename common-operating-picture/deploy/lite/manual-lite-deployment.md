# Manual Deployment: Docker
These notes are for installing this application on top of an already deployed DSP. It can be run in [Docker](#docker-deployment), or [Helm](#helm-deployment) using environment variables to configure the DSP connection. 

These notes are geared toward a docker deployment.

## TLS Certificates
Three certificates are required for COP.

1. `dsp-keys/rootCA.pem` - The DSP Root CA
1. `dsp-keys/local-dsp.virtru.com.pem` - A TLS Cert for COP (a valid web certificate issued by the DSP Root CA)
1. `dsp-keys/local-dsp.virtru.com.key.pem` - A TLS Key for COP (a valid web certificate issued by the DSP Root CA)

If using `mkcert` for local development, you can generate these keys with the following:
```sh
APP_ROOT=$(git rev-parse --show-toplevel)

mkdir -p "$APP_ROOT/dsp-keys"
cp -n "$(mkcert -CAROOT)"/rootCA.pem "$APP_ROOT/dsp-keys"

mkcert -cert-file "$APP_ROOT/dsp-keys/local-dsp.virtru.com.pem" -key-file "$APP_ROOT/dsp-keys/local-dsp.virtru.com.key.pem" local-dsp.virtru.com "*.local-dsp.virtru.com" localhost
```

## Keycloak Client
By default, this applicaition expects a client named "dsp-cop-client". A JSON template has been provided for import. **A few modifications are required before importing**

1. Prepare the `keycloak-client.json` file for your $DSP_ENDPOINT
   ```sh
   APP_ROOT=$(git rev-parse --show-toplevel)
   DSP_ENDPOINT="https://local-dsp.virtru.com:8080"

   sed -i '' -e "s|https://platform.example.com|$DSP_ENDPOINT|g" "$APP_ROOT/deploy/release-assets/keycloak-client.json"
   ```
1. Import the Keycloak Client.  
   1. Authenticate as the Keycloak admin to the Keycloak UI.
   1. Navigate into the `opentdf` realm, and click `"Clients"` in the left-side menu.
   1. Click `"Import client"` in the center of the UI.
   1. Select `keycloak-client.json` that you've modified above.
   1. The current web origins configuration is permissive.  Tighten as needed.

## Services and Ports
COP services are available on the following ports:
- [Database](#postgres-database): `https://local-dsp.virtru.com:15433`
- [Frontend](#react-frontend): `https://local-dsp.virtru.com:5001`
- [Backend (GRPc)](#golang-backend): `https://local-dsp.virtru.com:5002`

### Postgres Database
For local development, run the and provision database locally in docker:
```sh
APP_ROOT=$(git rev-parse --show-toplevel)

docker compose -f "$APP_ROOT/compose/docker-compose.cop-db.yaml" up --build
```

### React Frontend
There are two ways to run the frontend:

#### Vite + Hot Module Replacement (HMR)
Run the application locally, with hot reloading.
```sh
APP_ROOT=$(git rev-parse --show-toplevel)

cd "$APP_ROOT/ui"
nvm use
npm ci
npm start
```

The dev frontend can be found at: `https://local-dsp.virtru.com:5173/`

#### Production Build
Build the static assets and serve them with the Go server.
```sh
APP_ROOT=$(git rev-parse --show-toplevel)

cd "$APP_ROOT/ui"
nvm use
npm ci
npm run build
```

Start the [Go Server](#golang-backend)

### GoLang Backend
#### VSCode Debugger
To use the VSCode debugger for the Go backend, follow these steps:

1. [Start the database in docker](#postgres-database)

1. Start the Web Application:

   Choose one:
      - [Vite + HMR](#vite--hot-module-replacement-hmr)
      - [Production Build](#production-build)

1. Attach the VSCode Go debugger:

   There are two debug configurations based on how you started your frontend.
   
   _**Both will attach to the Go backend.**_

   - **Run with mock assets** - Vite + Hot Module Replacement (HMR)
   - **Run with embedfiles** - Production Build
      - Serves the statically built frontend form the `/ui/dist` directory.


#### Compile and Run Locally
If you don't need the debugger, you can run the Go backend locally:

1. [Start the database in docker](#postgres-database)

1. Start the Web Application:

   Choose one:
      - [Vite + HMR](#vite--hot-module-replacement-hmr)
      - [Production Build](#production-build)

1. Start the Go server:

   ⚠️ There are two options based on how you started your frontend. Only choose one!
   
   - Vite + HMR
      ```sh
      APP_ROOT=$(git rev-parse --show-toplevel)

      cd "$APP_ROOT"
      go run . serve
      ```
   - Production Build
      ```sh
      APP_ROOT=$(git rev-parse --show-toplevel)

      cd "$APP_ROOT"
      go run -tags embedfiles . serve
      ```

## Docker Deployment

This application is designed to install on top of an already deployed DSP. It can be run in Docker, using environment variables to configure the DSP connection.

### Configure
Use these commands to prepare the configuraiton file for docker:

```sh
APP_ROOT=$(git rev-parse --show-toplevel)
cp "$APP_ROOT/config.example.yaml" "$APP_ROOT/config.docker.yaml"

sed -i '' -e 's|localhost:15432|cop-db:5432|g' "$APP_ROOT/config.docker.yaml"
sed -i '' -e 's|public_server_host: local-dsp.virtru.com:5002|public_server_host: https://local-dsp.virtru.com:5002|g' "$APP_ROOT/config.docker.yaml"
sed -i '' -e 's|public_static_host: local-dsp.virtru.com:5001|public_static_host: https://local-dsp.virtru.com:5001|g' "$APP_ROOT/config.docker.yaml"
```

### Start the Stack
The docker compose stack is as follows:

- `cop-db` (postgres)
- `cop-db-setup` (temporary provisioning container)
- `cop-web-server` (Go backend + static web assets)

Run the following command to build and run the container(s)

```sh
APP_ROOT=$(git rev-parse --show-toplevel)

docker compose -f "$APP_ROOT/docker-compose.cop.yaml" up --build
```

## Helm Deployment
Updated helm instructions coming soon.

For now, reference the [Legacy Docs](./charts/README.md)
