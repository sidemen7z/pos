import { BRAND, allowedOrigins } from "../_shared/brand.ts";
Deno.serve(async (req) => {
  const origin = req.headers.get("origin") ?? "";
  const cors = allowedOrigins.includes(origin) ? origin : BRAND.appDomain;
  const headers = { "Access-Control-Allow-Origin": cors, "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  // TODO: create Razorpay order (stub returns mock for Phase 2 pay-at-counter)
  return new Response(JSON.stringify({ ok: true, brand: BRAND.name, mode: "pay_at_counter_stub" }), { headers });
});
