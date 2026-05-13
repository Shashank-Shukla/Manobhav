/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));
const certPath = (fileName: string) => resolve(configDir, 'certs', fileName);

export default defineConfig({
  plugins: [react()],
  server: {
    https: {
      key: readFileSync(certPath('localhost-key.pem')),
      cert: readFileSync(certPath('localhost-cert.pem')),
    },
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.ts',
  },
});
