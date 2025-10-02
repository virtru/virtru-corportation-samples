const env = window.VIRTRU_DSP_COP_ENV;

export const config = {
  releaseVersion: '0.8.0',
  tileServerUrl: import.meta.env.VITE_TILE_SERVER_URL || env?.tileServerUrl,
  grpcServerUrl: import.meta.env.VITE_GRPC_SERVER_URL || env?.copUrl,
  dsp: {
    baseUrl: import.meta.env.VITE_DSP_BASE_URL || env?.platformEndpoint,
    kasUrl: import.meta.env.VITE_DSP_KAS_URL || env?.kasUrl,
    keycloak: {
      serverUrl: import.meta.env.VITE_DSP_KC_SERVER_URL || env?.idpUrl,
      clientId: import.meta.env.VITE_DSP_KC_CLIENT_ID || env?.oidcClientId,
      directAuthEnabled: import.meta.env.VITE_DSP_KC_DIRECT_AUTH || env?.keycloakDirectAuth,
    },
  },
  formSubmitNanoTdf: import.meta.env.VITE_FORM_SUBMIT_NANO_TDF || env?.formSubmitNanoTdf,
};
