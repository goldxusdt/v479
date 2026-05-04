import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import * as Sentry from "@sentry/react";

// React 19 findDOMNode Polyfill for legacy libraries (e.g. react-transition-group, react-quill)
// @ts-ignore
import * as ReactDOMLegacy from "react-dom";
if (!(ReactDOMLegacy as any).findDOMNode) {
  (ReactDOMLegacy as any).findDOMNode = (instance: any) => {
    if (instance instanceof HTMLElement) return instance;
    if (instance && typeof instance === "object") {
      if (instance.getDOMNode) return instance.getDOMNode();
      if (instance.node) return instance.node;
    }
    return null;
  };
}
import "./index.css";
import App from "./App.tsx";
import { AppWrapper } from "./components/common/PageMeta.tsx";
import { AuthProvider } from "./contexts/AuthContext.tsx";
import { SettingsProvider } from "./contexts/SettingsContext.tsx";
import { initializeSecurity } from "./services/security.ts";

// Initialize Security Layer
initializeSecurity();

// Initialize Sentry for real-time error tracking
Sentry.init({
  dsn: "https://7264a9388c3a886b45f4706598375811@o4508920959074304.ingest.us.sentry.io/4508920970346496",
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Failed to find the root element");

ReactDOM.createRoot(rootElement).render(
  <StrictMode>
    <SettingsProvider>
      <AuthProvider>
        <AppWrapper>
          <App />
        </AppWrapper>
      </AuthProvider>
    </SettingsProvider>
  </StrictMode>
);

// Register Service Worker for PWA functionality
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('PWA ServiceWorker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('PWA ServiceWorker registration failed:', error);
      });
  });
}
