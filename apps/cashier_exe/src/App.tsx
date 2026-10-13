import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
// Aise Bites Cashier — Aurora premium POS (LIVE): open sessions, GST bill,
// discount with audit reason, split-ready payments, realtime, F-key hotkeys.
const c = () => createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const rs = (p: number) => `₹${((p || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const MODES: Record<string, string> = { upi: "UPI · QR / intent", cash: "Cash · drawer", card: "Card · record", credit: "Credit · ledger" };

export default function App() {
  const [mode, setMode] = useState("upi");
  const [disc, setDisc] = useState(0);
  const [reason, setReason] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [msg, setMsg] = useState("");
  const [now, setNow] = useState(Date.now());
  useEffectHotkeys(charge);
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
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
    const { data: sess } = await s.from("table_sessions").select("*, tables(label), orders(id,total_paise,status)").eq("restaurant_id", restId).eq("status", "open").order("created_at", { ascending: false });
    setSessions(sess ?? []);
    const cur = (sess ?? []).find((x: any) => x.id === (keepSession ?? sel?.id)) ?? (sess ?? [])[0] ?? null;
    setSel(cur);
    if (cur) {
      const { data: o } = await s.from("orders").select("*, order_items(*)").eq("session_id", cur.id).neq("status", "cancelled").order("created_at");
      setOrders(o ?? []);
    } else setOrders([]);
  }
  const lines = orders.flatMap((x: any) => (x.order_items ?? []).map((it: any) => ({ ...it, ost: x.status })));
  const sub = orders.reduce((t: number, o: any) => t + (o.subtotal_paise || 0), 0);
  const tax = orders.reduce((t: number, o: any) => t + (o.tax_paise || 0), 0);
  const discAmt = Math.round((sub + tax) * (disc || 0) / 100);
  const total = sub + tax - discAmt;
  const itemCount = lines.reduce((t: number, l: any) => t + l.qty, 0);
  async function charge() {
    if (!sel || total <= 0) { setMsg("Nothing to charge"); return; }
    const s = c();
    if (disc > 0 && !reason.trim()) { setMsg("⚠ Discount reason required for audit"); return; }
    for (const o of orders) {
      await s.from("orders").update({ discount_paise: Math.round((o.total_paise || 0) * (disc || 0) / 100), note: reason || o.note }).eq("id", o.id);
      await s.from("payments").insert({ restaurant_id: o.restaurant_id, order_id: o.id, session_id: sel.id, mode, amount_paise: Math.round((o.total_paise || 0) * (1 - (disc || 0) / 100)), status: mode === "upi" ? "pending" : "paid" });
      if (mode !== "upi") await s.from("orders").update({ status: "paid" }).eq("id", o.id);
    }
    setMsg(mode === "upi" ? "UPI pending — show dynamic QR, webhook auto-confirms" : "✓ Payment recorded");
    setDisc(0); setReason("");
  }
  return <div className="pos-grid">
    {/* LEFT — tables */}
    <aside className="pos-side">
      <div className="brandrow"><img src="/logo.png" alt="" /><div><b>Aise Bites</b><span>Cashier · live <i className="livedot" /></span></div></div>
      <div className="sidetitle">OPEN TABLES · {sessions.length}</div>
      <div className="tablescroll">
        {sessions.length === 0 && <div className="emptycard">No open sessions.<br />Scan a QR to start one.</div>}
        {sessions.map((t: any) => {
          const tt = (t.orders ?? []).reduce((s: number, o: any) => s + (o.status === "cancelled" ? 0 : (o.total_paise || 0)), 0);
          const on = sel?.id === t.id;
          return <button key={t.id} onClick={() => { setSel(t); load(c(), t.restaurant_id, t.id); }} className={on ? "tablecard on" : "tablecard"}>
            <span className="tlabel">{t.tables?.label ?? "Table"}</span>
            <span className="tamt">{rs(tt)}</span>
            <span className="tmeta">{(t.orders ?? []).length} orders · {String(t.id).slice(0, 6)}</span>
          </button>;
        })}
      </div>
      <div className="clock">{new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} · {new Date(now).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div>
    </aside>
    {/* MIDDLE — bill */}
    <main className="pos-bill">
      <div className="billhead">
        <div><h2>Bill · {sel?.tables?.label ?? "—"}</h2><span className="mono dim">{sel ? `session ${String(sel.id).slice(0, 8)}` : "select a table"}</span></div>
        {sel && <span className="statuspill">{orders.length} order{orders.length === 1 ? "" : "s"} · {itemCount} items</span>}
      </div>
      <div className="billcard">
        {lines.length === 0 && <div className="emptybill">🧾 No items yet.<br /><span>Orders from this table appear here in under a second.</span></div>}
        {lines.map((l: any) => <div key={l.id} className="bline">
          <div><b>{l.name_snapshot}</b>{l.note ? <div className="note">✎ {l.note}</div> : null}<span className={"mini " + l.ost}>{l.ost}</span></div>
          <div className="bright"><span className="qty">×{l.qty}</span><b className="mono">{rs(l.price_paise * l.qty)}</b></div>
        </div>)}
        {lines.length > 0 && <div className="totals">
          <div><span>Subtotal</span><span className="mono">{rs(sub)}</span></div>
          <div><span>CGST 2.5%</span><span className="mono">{rs(Math.round(tax / 2))}</span></div>
          <div><span>SGST 2.5%</span><span className="mono">{rs(Math.round(tax / 2))}</span></div>
          <div className="discrow"><span>Discount</span><span><input value={disc} onChange={(e) => setDisc(+e.target.value || 0)} />% <input className="reason" placeholder="reason (audit)" value={reason} onChange={(e) => setReason(e.target.value)} /></span></div>
          {discAmt > 0 && <div className="neg"><span>You save</span><span className="mono">−{rs(discAmt)}</span></div>}
          <div className="grand"><span>Total</span><span className="mono">{rs(total)}</span></div>
        </div>}
      </div>
      {msg && <div className="toast">{msg}</div>}
    </main>
    {/* RIGHT — payment */}
    <aside className="pos-pay">
      <div className="payhead"><h3>Payment</h3><span className="keychip">F8 pay · F9 print · F2 new</span></div>
      {(Object.keys(MODES)).map((m) => <button key={m} onClick={() => setMode(m)} className={mode === m ? "modebtn on" : "modebtn"}><b>{m.toUpperCase()}</b><span>{MODES[m]}</span></button>)}
      <button onClick={charge} className="charge">Charge {rs(total)}</button>
      <button onClick={() => window.print()} className="printbtn">🖨 Print · 80mm</button>
      <div className="payfoot">Powered by AiseServe, aise360.com<br />GST invoice · FY-sequence</div>
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
