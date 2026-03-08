/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_STORE_ADAPTER?: 'dev-config'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
