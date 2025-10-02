# dsp-cop chart 

Helm Chart for installing COP + NiFi along side Virtru Data Security Platform 2.x.

## Setup
Configure COP to use the same TLS certificate as Platform, Keycloak, and Tagging PDP. 

The certificate should contain SANs for each of the aforementioned services.

## Usage
Use helm to install the chart

```sh
cd charts
RELEASE_NAME=cop-nifi
helm install —upgrade "$RELEASE_NAME" . -f=values.yaml
```
