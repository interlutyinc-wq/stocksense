import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Lower sample rate in production to control costs
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

  enabled: process.env.NODE_ENV === "production",

  beforeSend(event) {
    // Scrub sensitive fields from server-side events
    if (event.request?.data) {
      const data = event.request.data as Record<string, unknown>;
      if (typeof data === "object") {
        delete data["access_token"];
        delete data["password"];
        delete data["stripe_customer_id"];
      }
    }
    return event;
  },
});
