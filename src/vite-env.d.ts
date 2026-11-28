/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudinary cloud name used to build image delivery URLs. */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string
  readonly VITE_DATA_STORE_ADAPTER?: 'dev-config'
}
