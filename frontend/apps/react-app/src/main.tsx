import { CommonProvider } from '@common/ui';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { http } from './api';
import { App } from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CommonProvider http={http}>
      <App />
    </CommonProvider>
  </StrictMode>,
);
