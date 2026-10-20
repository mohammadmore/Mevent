import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './lib/AuthContext';
import { installAuthFetch } from './lib/authFetch';
import { ToastContainer } from './components/ToastContainer';
import { DialogHost } from './lib/dialog';
import { registerServiceWorker } from './lib/pwa';

installAuthFetch();
registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <App />
      <ToastContainer />
      <DialogHost />
    </AuthProvider>
  </StrictMode>,
);
