import * as Sentry from '@sentry/node';
import { Application } from 'express';

/**
 * Initialize Sentry error monitoring.
 * Set SENTRY_DSN in environment variables to activate.
 * Get your DSN from: https://sentry.io → Create Project → Node.js
 */
export function initSentry(app?: Application) {
  const dsn = process.env.SENTRY_DSN;
  
  if (!dsn) {
    console.log('[SENTRY] No SENTRY_DSN found. Error monitoring disabled.');
    return { captureException: () => {}, flush: () => Promise.resolve() };
  }

  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV || 'development',
    release: `zentrixcrm@${process.env.npm_package_version || '1.0.0'}`,
    
    // Performance monitoring - sample 20% of transactions in production
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,
    
    // Filter out noisy errors
    ignoreErrors: [
      'ECONNREFUSED',        // Redis not running locally
      'ECONNRESET',          // Client disconnected
      'ERR_HTTP_HEADERS_SENT',
    ],
    
    beforeSend(event) {
      // Strip sensitive data from request bodies
      if (event.request?.data) {
        const sensitive = ['password', 'token', 'secret', 'private_key'];
        for (const key of sensitive) {
          if (event.request.data[key]) {
            event.request.data[key] = '[REDACTED]';
          }
        }
      }
      return event;
    }
  });

  if (app) {
    Sentry.setupExpressErrorHandler(app);
  }

  console.log('✅ Sentry error monitoring initialized');
  return Sentry;
}

export { Sentry };
