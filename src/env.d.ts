/// <reference types="vite/client" />

// True only in the e2e build (`vite build --mode e2e`). Never true in production.
declare const __E2E__: boolean;

// The version in package.json, set by vite.config.ts.
declare const __APP_VERSION__: string;
