/// <reference types="vite/client" />

// True only in the e2e build (`vite build --mode e2e`). Never true in production.
declare const __E2E__: boolean;

// The app version from package.json, filled in at build time.
declare const __APP_VERSION__: string;
