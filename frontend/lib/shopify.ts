export function normalizeShopDomain(input: string): string | null {
  const trimmed = input.trim().toLowerCase().replace(/^https?:\/\//, "");
  if (!trimmed) return null;
  const host = trimmed.split("/")[0] ?? "";
  if (!host.endsWith(".myshopify.com")) {
    if (!/^[a-z0-9-]+$/.test(host)) return null;
    return `${host}.myshopify.com`;
  }
  return host;
}

export const DEFAULT_SHOPIFY_SCOPES =
  "read_products,read_inventory,read_orders,read_locations";
