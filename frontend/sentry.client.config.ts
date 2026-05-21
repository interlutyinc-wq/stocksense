import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Performance monitoring
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

  // Session replay — record user sessions around errors
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Only enable in production
  enabled: process.env.NODE_ENV === "production",

  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,      // Privacy: mask all text in replays
      blockAllMedia: true,    // Privacy: block all media
    }),
  ],

  beforeSend(event) {
    // Scrub sensitive data before sending to Sentry
    if (event.request?.headers) {
      delete event.request.headers["authorization"];
      delete event.request.headers["cookie"];
    }
    return event;
  },
});
