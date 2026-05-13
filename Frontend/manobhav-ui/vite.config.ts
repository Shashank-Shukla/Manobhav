/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const configDir = dirname(fileURLToPath(import.meta.url));
const certPath = (fileName: string) => resolve(configDir, 'certs', fileName);
const localHttpsConfig = () => {
  const key = certPath('localhost-key.pem');
  const cert = certPath('localhost-cert.pem');

  if (!existsSync(key) || !existsSync(cert)) {
    return undefined;
  }

  return {
    key: readFileSync(key),
    cert: readFileSync(cert),
  };
};

export default defineConfig({
  plugins: [react()],
  server: {
    https: localHttpsConfig(),
  },
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: './src/test/setup.ts',
  },
});
