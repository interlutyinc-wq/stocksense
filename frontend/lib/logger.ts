/**
 * Structured logger for StockSense API.
 * Outputs JSON in production for log aggregation, pretty-prints in development.
 * Every log entry includes timestamp, level, service, and context.
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  service: "stocksense-api";
  message: string;
  [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";
const LOG_LEVEL = (process.env.LOG_LEVEL ?? "info") as LogLevel;

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info:  1,
  warn:  2,
  error: 3,
};

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[LOG_LEVEL];
}

function formatEntry(level: LogLevel, message: string, ctx: Record<string, unknown> = {}): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    service: "stocksense-api",
    message,
    ...ctx,
  };
}

function output(entry: LogEntry): void {
  if (IS_PROD) {
    // JSON for log aggregation (Datadog, Papertrail, CloudWatch, etc.)
    const line = JSON.stringify(entry);
    if (entry.level === "error" || entry.level === "warn") {
      console.error(line);
    } else {
      console.log(line);
    }
  } else {
    // Pretty-print for local development
    const { timestamp, level, message, ...rest } = entry;
    const colors: Record<LogLevel, string> = {
      debug: "\x1b[37m",
      info:  "\x1b[36m",
      warn:  "\x1b[33m",
      error: "\x1b[31m",
    };
    const reset = "\x1b[0m";
    const time = timestamp.slice(11, 23); // HH:MM:SS.mmm
    const hasCtx = Object.keys(rest).filter(k => k !== "service").length > 0;
    console.log(
      `${colors[level]}[${level.toUpperCase()}]${reset} ${time} ${message}` +
        (hasCtx ? `\n  ${JSON.stringify(rest, null, 2).replace(/\n/g, "\n  ")}` : "")
    );
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

export const logger = {
  debug(message: string, ctx?: Record<string, unknown>): void {
    if (shouldLog("debug")) output(formatEntry("debug", message, ctx));
  },

  info(message: string, ctx?: Record<string, unknown>): void {
    if (shouldLog("info")) output(formatEntry("info", message, ctx));
  },

  warn(message: string, ctx?: Record<string, unknown>): void {
    if (shouldLog("warn")) output(formatEntry("warn", message, ctx));
  },

  error(message: string, err?: Error | unknown, ctx?: Record<string, unknown>): void {
    if (!shouldLog("error")) return;
    const errCtx: Record<string, unknown> = {};
    if (err instanceof Error) {
      errCtx.error = err.message;
      errCtx.stack = IS_PROD ? undefined : err.stack;
      errCtx.name = err.name;
    } else if (err !== undefined) {
      errCtx.error = String(err);
    }
    output(formatEntry("error", message, { ...errCtx, ...ctx }));
  },

  /** Create a child logger with persistent context fields. */
  child(persistentCtx: Record<string, unknown>) {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) => logger.debug(msg, { ...persistentCtx, ...ctx }),
      info:  (msg: string, ctx?: Record<string, unknown>) => logger.info(msg,  { ...persistentCtx, ...ctx }),
      warn:  (msg: string, ctx?: Record<string, unknown>) => logger.warn(msg,  { ...persistentCtx, ...ctx }),
      error: (msg: string, err?: Error | unknown, ctx?: Record<string, unknown>) =>
        logger.error(msg, err, { ...persistentCtx, ...ctx }),
    };
  },

  /** Time an async operation and log its duration. */
  async time<T>(
    label: string,
    fn: () => Promise<T>,
    ctx?: Record<string, unknown>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      logger.info(label, { ...ctx, duration_ms: Date.now() - start, status: "ok" });
      return result;
    } catch (err) {
      logger.error(label, err, { ...ctx, duration_ms: Date.now() - start, status: "error" });
      throw err;
    }
  },
};
