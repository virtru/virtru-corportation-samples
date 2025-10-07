/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_TILE_SERVER_URL: string;
  readonly VITE_GRPC_SERVER_URL: string;
  readonly VITE_FORM_SUBMIT_NANO_TDF: string;
  readonly VITE_DSP_BASE_URL: string;
  readonly VITE_DSP_KAS_URL: string;
  readonly VITE_DSP_KC_SERVER_URL: string;
  readonly VITE_DSP_KC_CLIENT_ID: string;
  readonly VITE_DSP_KC_DIRECT_AUTH: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
