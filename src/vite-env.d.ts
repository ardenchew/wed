/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Cloudinary cloud name used to build image delivery URLs. */
  readonly VITE_CLOUDINARY_CLOUD_NAME?: string
  /** Base URL of the API Worker (sign-in, RSVPs, admin), e.g. `http://localhost:8787` in dev. */
  readonly VITE_RSVP_API_URL?: string
}
