/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_REDIS_ENDPOINT: string
  readonly VITE_REDIS_AUTH_TOKEN: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
