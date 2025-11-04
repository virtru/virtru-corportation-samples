# Lite Deployment: Docker
These notes are for installing this application on top of an already deployed DSP. It can be run in Docker, or Helm using environment variables to configure the DSP connection.

These notes are geared toward a docker deployment.

## Convenience Scripts
If you are using the `data-security-platform` docker-compose development stack, the included convenience scripts _should_ work out of the box for local development.

To deploy in lite mode manually, see [manual-lite-deployment.md](./manual-lite-deployment.md)

### Start:

1. Start the docker stack
   ```sh
   ./deploy/stand-alone/cop.docker-compose.up.sh
   ```
2. Import the keycloak client
   - Read More: [Keycloak Client](../release-assets/Docker_Deployment.md#keycloak-clients)
3. Update DSP CORS Policy 
   - Read More: [DSP CORS](../release-assets/Docker_Deployment.md#platform-configuration)



### Stop:

1. Stop the docker stack
```sh
./deploy/stand-alone/cop.docker-compose.down.sh
```
