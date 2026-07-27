import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Safe global overrides for dialog APIs inside sandboxed iframe environments
if (typeof window !== 'undefined') {
  const nativeConfirm = window.confirm;
  window.confirm = (message?: string) => {
    try {
      const isIframe = window.self !== window.top;
      if (isIframe) {
        return true; // Bypass confirm in sandboxed preview iframe to prevent crashes/blocking
      }
      return nativeConfirm ? nativeConfirm(message) : true;
    } catch (e) {
      return true; // Fallback to true if native confirm is blocked or throws
    }
  };

  const nativeAlert = window.alert;
  window.alert = (message?: string) => {
    try {
      const isIframe = window.self !== window.top;
      if (isIframe) {
        window.dispatchEvent(new CustomEvent('mep-alert-toast', { detail: message }));
        console.log("Alert in iframe:", message);
        return;
      }
      if (nativeAlert) {
        nativeAlert(message);
      } else {
        window.dispatchEvent(new CustomEvent('mep-alert-toast', { detail: message }));
      }
    } catch (e) {
      window.dispatchEvent(new CustomEvent('mep-alert-toast', { detail: message }));
      console.warn("Alert blocked:", message);
    }
  };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
