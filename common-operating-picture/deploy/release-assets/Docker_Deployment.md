
# COP Deployment: Docker Compose
_version <release_tag>_

This deployment assumes that the Virtru Platform has been installed via Docker.

To deploy the COP application to docker, follow this guide:

## Pre-requisites

1. Install the Virtru Data Security Platform (DSP), version 2.1.x or greater.
1. Establish [Application Pre-requisites](#pre-requisites)
1. [Platform Configuration](#platform-configuration)
1. [Prepare TLS Certificates](#prepare-tls-certificates).
1. [Deploy the application-specific Keycloak client](#keycloak-clients) (a server-side NPE account).
1. Ensure you have the following tools installed:
    - [yq](https://mikefarah.gitbook.io/yq/v3.x#install)
    - [gh](https://github.com/cli/cli?tab=readme-ov-file#installation)

### Platform Configuration

Update your Virtru platform configuration (`dsp.yaml` or the appropriate `ConfigMap`), to allow ingress from the COP origin. This blob will be inserted into the `platform.server` block (shown as `server:` below):

```yaml
  server:
    cors:
      enabled: true
      allowedorigins:
        # Note that the protocol/scheme (e.g. http:// versus https://) matters
        # when configuring CORS.
        #
        # Be sure to configure the following appropriately
        # - "https://cop.local-dsp.virtru.com"
        # - "https://cop-api.local-dsp.virtru.com"
        # Specifying a port may or may not work, depending on your container platform
        # - "http://local-dsp.virtru.com:5001"
        # - "http://local-dsp.virtru.com:5002"
        # Alternatively, use an asterisk to allow all CORS origins.
        # This is insecure.
         - "*"
      allowedmethods:
        - GET
        - POST
        - PATCH
        - PUT
        - DELETE
        - OPTIONS
      # List of headers that are allowed in a request
      allowedheaders:
        - ACCEPT
        - Authorization
        - Content-Type
        - X-CSRF-Token
        - virtru-ntdf-version
      # List of response headers that browsers are allowed to access
      exposedheaders:
        - Link
      # Sets whether credentials are included in the CORS request
      allowcredentials: true
      # Sets the maximum age (in seconds) of a specific CORS preflight request
      maxage: 3600
```

## Prepare TLS Certificates

This application depends on proper trust of the DSP platform. In other words,
the Certificate Authority (CA) or self-signed certificates used to deploy
the DSP platform, must be trusted (implicitly or explicitly) by the COP deployment.

Three certificate files are required for the docker deployment.

1. `dsp-keys/rootCA.pem` - The DSP Root CA
1. `dsp-keys/local-dsp.virtru.com.pem` - A TLS Cert for COP (a valid web certificate issued by the DSP Root CA)
1. `dsp-keys/local-dsp.virtru.com.key.pem` - A TLS Key for COP (a valid web certificate issued by the DSP Root CA)

If using `mkcert` for local development, you can gather these keys with the following commands:
```sh
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null && pwd)"

mkdir -p "$SCRIPT_DIR/dsp-keys"
cp "$(mkcert -CAROOT)"/rootCA.pem "$SCRIPT_DIR/dsp-keys"

mkcert -cert-file "$SCRIPT_DIR/dsp-keys/local-dsp.virtru.com.pem" -key-file "$SCRIPT_DIR/dsp-keys/local-dsp.virtru.com.key.pem" local-dsp.virtru.com "*.local-dsp.virtru.com" localhost
```


## Keycloak Clients

1. Prepare the `keycloak-client.json` file
    1. This file will be used to configure the Keycloak client
    1. Set the value of `protocolMappers[i].config["included.client.audience"]` to the FQDN of the Virtru Platform (ex: `https://local-dsp.virtru.com:8080`)
1. Import the Keycloak Client.  
    1. Authenticate as the Keycloak admin to the Keycloak UI.
    1. Navigate into the `opentdf` realm, and click `"Clients"` in the left-side menu.
    1. Click `"Import client"` in the center of the UI.
    1. Select `keycloak-client.json` that you've modified above.
    1. The current web origins configuration is permissive.  Tighten as needed.

## Docker Compose

> Note: This application uses a private Virtru image, authentication will be required.

Authenticate and pull the image:
```sh
GITHUB_USERNAME=<your-gh-username>
gh auth login --scopes read:packages | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

docker pull ghcr.io/virtru-corp/dsp-cop/cop-web-server:<release_tag>
```

Run the convenience script to start the stack using the `docker-compose.cop.yaml` file.

```sh
./cop.docker-start.sh
```

To stop the docker stack, run the teardown script:

```sh
./cop.docker-stop.sh
```

## Access COP
- The COP application (react) is at: `https://local-dsp.virtru.com:5001`
- The COP backend (go/grpc) is at: `https://local-dsp.virtru.com:5002`
- The COP database (postgres) is at: `local-dsp.virtru.com:15433`
