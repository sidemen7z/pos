import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
// Cashier POS (LIVE): open sessions from Supabase, bill lines from orders+items,
// discount with reason, payments recorded, realtime refresh, F-key hotkeys.
const c = () => createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
export default function App() {
  const [mode, setMode] = useState("upi");
  const [disc, setDisc] = useState(0);
  const [reason, setReason] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  useEffectHotkeys(charge);
  useEffect(() => {
    const s = c();
    (async () => {
      const { data: r } = await s.from("restaurants").select("*").eq("slug", "aise-bites").single();
      if (!r) { setMsg("No restaurant found — check seed"); return; }
      await load(s, r.id);
      s.channel("orders:cashier:" + r.id)
        .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load(s, r.id, sel?.id))
        .subscribe();
    })();
  }, []);
  async function load(s: any, restId: string, keepSession?: string) {
    const { data: sess } = await s.from("table_sessions").select("*, tables(label)").eq("restaurant_id", restId).eq("status", "open").order("created_at", { ascending: false });
    setSessions(sess ?? []);
    const cur = (sess ?? []).find((x: any) => x.id === (keepSession ?? sel?.id)) ?? (sess ?? [])[0] ?? null;
    setSel(cur);
    if (cur) {
      const { data: o } = await s.from("orders").select("*, order_items(*)").eq("session_id", cur.id).neq("status", "cancelled").order("created_at");
      setOrders(o ?? []);
      setLines((o ?? []).flatMap((x: any) => (x.order_items ?? []).map((it: any) => ({ ...it, order_id: x.id, order_status: x.status }))));
    } else { setOrders([]); setLines([]); }
  }
  const sub = lines.reduce((t: number, l: any) => t + l.price_paise * l.qty, 0);
  const discAmt = Math.round(sub * (disc || 0) / 100);
  const total = sub - discAmt;
  async function charge() {
    if (!sel || total <= 0) { setMsg("Nothing to charge"); return; }
    const s = c();
    if (disc > 0 && !reason.trim()) { setMsg("Discount reason required for audit"); return; }
    for (const o of orders) {
      await s.from("orders").update({ discount_paise: Math.round((o.total_paise || 0) * (disc || 0) / 100), note: reason || o.note }).eq("id", o.id);
      await s.from("payments").insert({ restaurant_id: o.restaurant_id, order_id: o.id, session_id: sel.id, mode, amount_paise: Math.round((o.total_paise || 0) * (1 - (disc || 0) / 100)), status: mode === "upi" ? "pending" : "paid" });
      if (mode !== "upi") await s.from("orders").update({ status: "paid" }).eq("id", o.id);
    }
    setMsg(mode === "upi" ? "UPI: show dynamic QR — auto-confirms on webhook (Phase 5)" : "Marked paid ✓");
    setDisc(0); setReason("");
  }
  return <div className="pos-grid" style={{ fontFamily: "Inter" }}>
    <aside style={{ background: "#F6F7FB", padding: 12, overflowY: "auto" }}><h3>Open tables (live)</h3>
      {sessions.length === 0 && <p style={{ color: "#6B7186" }}>No open sessions — scan a QR to start one.</p>}
      {sessions.map((t: any) => <div key={t.id} onClick={() => { setSel(t); load(c(), t.restaurant_id, t.id); }} style={{ background: sel?.id === t.id ? "#0F1222" : "#fff", color: sel?.id === t.id ? "#fff" : "#000", borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer" }}><b>{t.tables?.label ?? "Table"}</b><div style={{ fontSize: 12, fontFamily: "monospace" }}>{t.id.slice(0, 8)}</div></div>)}
    </aside>
    <main style={{ padding: 16, overflowY: "auto" }}><h2>Bill · {sel?.tables?.label ?? "—"}</h2>
      {lines.length === 0 && <p style={{ color: "#6B7186" }}>No items yet. Orders from the table appear here in under a second.</p>}
      {lines.map((l: any) => <div key={l.id} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #eee" }}><span>{l.name_snapshot} × {l.qty} <small style={{ color: "#6B7186" }}>({l.order_status})</small></span><b style={{ fontFamily: "monospace" }}>₹{((l.price_paise * l.qty) / 100).toFixed(0)}</b></div>)}
      <div style={{ marginTop: 12 }}>Subtotal ₹{(sub / 100).toFixed(0)} · Discount <input value={disc} onChange={(e) => setDisc(+e.target.value || 0)} style={{ width: 56, minHeight: 40 }} />% <input placeholder="reason (audit)" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: 40, borderRadius: 8, border: "1px solid #ddd", padding: "0 8px" }} /></div>
      <div style={{ fontSize: 28, fontWeight: 800, marginTop: 8, fontFamily: "monospace" }}>Total ₹{(total / 100).toFixed(0)}</div>
      {msg && <div style={{ marginTop: 8, background: "#EEF0F7", borderRadius: 10, padding: 10 }}>{msg}</div>}
    </main>
    <aside style={{ background: "#0F1222", color: "#fff", padding: 16 }}>
      <h3>Payment (F8)</h3>
      {["upi", "cash", "card", "credit"].map((m) => <button key={m} onClick={() => setMode(m)} style={{ display: "block", width: "100%", minHeight: 48, marginBottom: 8, borderRadius: 12, border: 0, background: mode === m ? "#6D5EF8" : "#1B2030", color: "#fff", fontWeight: 700 }}>{m.toUpperCase()}</button>)}
      <button onClick={charge} style={{ width: "100%", minHeight: 56, borderRadius: 14, border: 0, background: "#19C39A", fontWeight: 800, fontSize: 18 }}>Charge ₹{(total / 100).toFixed(0)} (F8)</button>
      <button onClick={() => window.print()} style={{ width: "100%", minHeight: 48, marginTop: 8, borderRadius: 12, background: "#262C3F", color: "#fff", border: 0 }}>Print (F9) · 80mm</button>
      <p style={{ fontSize: 12, opacity: .6 }}>Powered by AiseServe, aise360.com · GST invoice FY-sequence</p>
    </aside>
  </div>;
}
function useEffectHotkeys(charge: () => void) {
  const ref = React.useRef(charge); ref.current = charge;
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "F2") location.reload(); if (e.key === "F8") { e.preventDefault(); ref.current(); } if (e.key === "F9") window.print(); };
    window.addEventListener("keydown", h); return () => window.removeEventListener("keydown", h);
  }, []);
}
