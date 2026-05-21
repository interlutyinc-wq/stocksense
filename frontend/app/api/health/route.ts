/**
 * Health check endpoint — used by uptime monitors, load balancers, and ops tooling.
 * Returns service status, version, and dependency checks.
 * Publicly accessible — no auth required.
 */

import { createClient } from "@/lib/supabase/server";
import { shopifyBreaker, anthropicBreaker } from "@/lib/circuit-breaker";
import { getCacheStats } from "@/lib/cache";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ServiceStatus {
  status: "ok" | "degraded" | "down";
  latency_ms?: number;
  error?: string;
}

interface HealthResponse {
  status: "ok" | "degraded" | "down";
  version: string;
  timestamp: string;
  uptime_ms: number;
  services: {
    database: ServiceStatus;
    ai_engine: ServiceStatus;
    email: ServiceStatus;
  };
  circuit_breakers: {
    shopify: ReturnType<typeof shopifyBreaker.getStatus>;
    anthropic: ReturnType<typeof anthropicBreaker.getStatus>;
  };
  cache: ReturnType<typeof getCacheStats>;
  environment: string;
}

const START_TIME = Date.now();

async function checkDatabase(): Promise<ServiceStatus> {
  const t = Date.now();
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .limit(1);

    if (error) throw error;
    return { status: "ok", latency_ms: Date.now() - t };
  } catch (err) {
    return {
      status: "down",
      latency_ms: Date.now() - t,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

function checkAIEngine(): ServiceStatus {
  const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
  return hasKey
    ? { status: "ok" }
    : { status: "degraded", error: "ANTHROPIC_API_KEY not configured" };
}

function checkEmail(): ServiceStatus {
  const hasKey = Boolean(process.env.RESEND_API_KEY);
  return hasKey
    ? { status: "ok" }
    : { status: "degraded", error: "RESEND_API_KEY not configured" };
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const [database] = await Promise.all([checkDatabase()]);
  const aiEngine = checkAIEngine();
  const email = checkEmail();

  const allStatuses = [database.status, aiEngine.status, email.status];
  const overallStatus: "ok" | "degraded" | "down" = allStatuses.includes("down")
    ? "down"
    : allStatuses.includes("degraded")
    ? "degraded"
    : "ok";

  const response: HealthResponse = {
    status: overallStatus,
    version: process.env.NEXT_PUBLIC_APP_VERSION ?? "1.0.0",
    timestamp: new Date().toISOString(),
    uptime_ms: Date.now() - START_TIME,
    services: { database, ai_engine: aiEngine, email },
    circuit_breakers: {
      shopify: shopifyBreaker.getStatus(),
      anthropic: anthropicBreaker.getStatus(),
    },
    cache: getCacheStats(),
    environment: process.env.NODE_ENV ?? "production",
  };

  const httpStatus = overallStatus === "down" ? 503 : overallStatus === "degraded" ? 207 : 200;

  return NextResponse.json(response, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "X-Service": "stocksense-api",
    },
  });
}
