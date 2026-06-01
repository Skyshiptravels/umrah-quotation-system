/** Development-only logging for quotation API routes */
export function debugQuotation(
  endpoint: string,
  phase: "received" | "inserted" | "error" | "query",
  data: Record<string, unknown>
): void {
  if (process.env.NODE_ENV === "production") return;

  const prefix = `[quotation:${endpoint}]`;
  const payload = JSON.stringify(data, null, 2);
  if (phase === "error") {
    console.error(`${prefix} ERROR`, payload);
  } else {
    console.log(`${prefix} ${phase.toUpperCase()}`, payload);
  }
}
