import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@jitsi/react-sdk')) return 'jitsi';
            if (id.includes('@chakra-ui')) return 'chakra';
            if (id.includes('@emotion') || id.includes('framer-motion')) return 'chakra';
            if (id.includes('react')) return 'react';
          }
          return undefined;
        },
      },
    },
  },
});
