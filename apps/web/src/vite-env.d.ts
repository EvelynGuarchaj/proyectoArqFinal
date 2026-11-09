//dueño del archivo integrante C

/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_URL_API: string;
  readonly VITE_LLAVE_API_PANTALLA: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
