// Single source of truth for plan definitions, limits, and feature gates.
// Used by API routes (server) and dashboard UI (client).

export type PlanKey = "free" | "starter" | "pro" | "agency";

export interface PlanLimits {
  maxSkus: number;            // SKUs analyzed per run (-1 = unlimited)
  maxSuppliers: number;       // Max suppliers (-1 = unlimited)
  maxStores: number;          // Connected Shopify stores
  maxUsers: number;
  analysesPerMonth: number;   // -1 = unlimited
  poHistoryDays: number;      // Days of PO history (-1 = unlimited)
  canSendPO: boolean;
  canAutoImport: boolean;
  canSelectBusinessModel: boolean;
  canExportReports: boolean;
  allBusinessModels: boolean;
}

export const PLAN_LIMITS: Record<PlanKey, PlanLimits> = {
  free: {
    maxSkus: 10,
    maxSuppliers: 1,
    maxStores: 1,
    maxUsers: 1,
    analysesPerMonth: 1,
    poHistoryDays: 0,
    canSendPO: false,
    canAutoImport: false,
    canSelectBusinessModel: false,
    canExportReports: false,
    allBusinessModels: false,
  },
  starter: {
    maxSkus: 50,
    maxSuppliers: 10,
    maxStores: 1,
    maxUsers: 1,
    analysesPerMonth: -1,
    poHistoryDays: 30,
    canSendPO: true,
    canAutoImport: true,
    canSelectBusinessModel: true,
    canExportReports: false,
    allBusinessModels: true,
  },
  pro: {
    maxSkus: -1,
    maxSuppliers: -1,
    maxStores: 1,
    maxUsers: 3,
    analysesPerMonth: -1,
    poHistoryDays: 90,
    canSendPO: true,
    canAutoImport: true,
    canSelectBusinessModel: true,
    canExportReports: true,
    allBusinessModels: true,
  },
  agency: {
    maxSkus: -1,
    maxSuppliers: -1,
    maxStores: 5,
    maxUsers: 10,
    analysesPerMonth: -1,
    poHistoryDays: -1,
    canSendPO: true,
    canAutoImport: true,
    canSelectBusinessModel: true,
    canExportReports: true,
    allBusinessModels: true,
  },
};

export const PLAN_DISPLAY = {
  free: {
    name: "Free",
    price: 0,
    description: "Try StockSense with your first store.",
    cta: "Current plan",
    badge: null,
  },
  starter: {
    name: "Starter",
    price: 49,
    description: "For solo operators getting started with AI inventory.",
    cta: "Get Starter →",
    badge: null,
  },
  pro: {
    name: "Pro",
    price: 149,
    description: "Full autonomous agent for scaling ecommerce brands.",
    cta: "Get Pro →",
    badge: "Most Popular",
  },
  agency: {
    name: "Agency",
    price: 399,
    description: "For agencies managing multiple Shopify stores.",
    cta: "Get Agency →",
    badge: null,
  },
} as const;

export const STRIPE_PRICE_IDS: Record<Exclude<PlanKey, "free">, string> = {
  starter: process.env.STRIPE_STARTER_PRICE_ID ?? "",
  pro: process.env.STRIPE_PRO_PRICE_ID ?? "",
  agency: process.env.STRIPE_AGENCY_PRICE_ID ?? "",
};

export function getLimits(plan: string): PlanLimits {
  // Handle legacy 'agent' plan as 'pro'
  const normalized = plan === "agent" ? "pro" : plan;
  return PLAN_LIMITS[normalized as PlanKey] ?? PLAN_LIMITS.free;
}
