import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          chakra: ['@chakra-ui/react', '@chakra-ui/icons', '@emotion/react', '@emotion/styled', 'framer-motion'],
          jitsi: ['@jitsi/react-sdk'],
        },
      },
    },
  },
});
