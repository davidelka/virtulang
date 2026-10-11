import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { actions } from './store/useProgress';
import './styles.css';

if (import.meta.env.DEV && new URLSearchParams(location.search).has('seed')) {
  actions.seedDemo();
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js'));
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
