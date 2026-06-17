import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { ErrorBoundary } from './shared/error/ErrorBoundary';
import { ErrorPage40x } from './shared/error/ErrorPage40x';
import { ErrorPage50x } from './shared/error/ErrorPage50x';
import { loadRuntimeConfig } from './shared/config/runtimeConfig';

const root = createRoot(document.getElementById('root')!);

loadRuntimeConfig()
  .then(() => {
    root.render(
      <StrictMode>
        <ErrorBoundary context="root" fallback={<ErrorPage40x onHome={() => window.location.assign('/')} />}>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  })
  .catch(() => {
    root.render(
      <StrictMode>
        <ErrorPage50x onHome={() => window.location.reload()} />
      </StrictMode>,
    );
  });
