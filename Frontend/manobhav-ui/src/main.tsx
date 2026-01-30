import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { ErrorPage40x } from './components/Error/ErrorPage40x';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary context="root" fallback={<ErrorPage40x onHome={() => window.location.assign('/')} />}>
      <ChakraProvider>
        <App />
      </ChakraProvider>
    </ErrorBoundary>
  </StrictMode>,
);
