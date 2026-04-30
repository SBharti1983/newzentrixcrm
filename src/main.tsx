import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import * as Sentry from '@sentry/react'
import './index.css'
import App from './App'

import posthog from 'posthog-js'

// Initialize PostHog Telemetry
posthog.init(import.meta.env.VITE_POSTHOG_API_KEY || "phc_placeholder_key", {
  api_host: import.meta.env.VITE_POSTHOG_HOST || 'https://app.posthog.com',
  person_profiles: 'identified_only',
  autocapture: true,
  capture_pageview: true,
})

// Initialize Sentry Error Monitoring
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || "", // Ensure you add VITE_SENTRY_DSN to your .env file
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of the transactions
  // Session Replay
  replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
  replaysOnErrorSampleRate: 1.0, // If you're not already sampling the entire session, change the sample rate to 100% when sampling sessions where errors occur.
});

createRoot(document.getElementById('root')).render(
    <App />
)
