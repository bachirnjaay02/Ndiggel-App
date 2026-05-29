import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './app';
import { register as registerSW } from './serviceWorkerRegistration';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Active le service worker pour le mode PWA / hors ligne
registerSW();
