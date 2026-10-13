import { BRAND } from "../_shared/brand.ts";
Deno.serve(async (req) => {
  // TODO: verify Razorpay signature, mark payments.paid idempotently
  return new Response(JSON.stringify({ ok: true, brand: BRAND.name }), { headers: { "Content-Type": "application/json" } });
});
