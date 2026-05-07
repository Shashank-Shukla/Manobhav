import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './shared/error/ErrorBoundary';
import { ErrorPage40x } from './shared/error/ErrorPage40x';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary context="root" fallback={<ErrorPage40x onHome={() => window.location.assign('/')} />}>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
