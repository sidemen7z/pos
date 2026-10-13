import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { footerText } from "@aiseserve/core";
// Aise Bites BUSINESS — one APK, RBAC tabs: Floor (waiter) · Kitchen (kitchen) · Billing (cashier) · manager sees all.
// Role is picked on first launch and stored locally (Supabase Auth staff login plugs in here in Phase 6).
const sb = () => createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
type Role = "waiter" | "kitchen" | "cashier" | "manager";
const TABS: Record<Role, string[]> = {
  waiter: ["floor", "orders"],
  kitchen: ["kitchen"],
  cashier: ["billing", "orders"],
  manager: ["floor", "kitchen", "billing", "orders"],
};
const NEXT: Record<string, string> = { new: "preparing", preparing: "ready", ready: "served" };

function useRest() {
  const [restId, setRestId] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const { data: r } = await sb().from("restaurants").select("id").eq("slug", "aise-bites").single();
      if (r) setRestId(r.id);
    })();
  }, []);
  return restId;
}

// ---------- FLOOR (waiter) ----------
function FloorView({ restId }: { restId: string }) {
  const [tables, setTables] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [sessOrders, setSessOrders] = useState<any[]>([]);
  const [menu, setMenu] = useState<any[]>([]);
  const load = async () => {
    const s = sb();
    const { data: t } = await s.from("tables").select("*").eq("restaurant_id", restId).order("label");
    setTables(t ?? []);
    const { data: m } = await s.from("menu_items").select("id,name,available").eq("restaurant_id", restId).order("name");
    setMenu(m ?? []);
  };
  useEffect(() => {
    load();
    const ch = sb().channel("floor:" + restId)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "tables" }, load)
      .subscribe();
    return () => { sb().removeChannel(ch); };
  }, [restId]);
  const openSheet = async (t: any) => {
    setSel(t);
    const s = sb();
    const { data: sess } = await s.from("table_sessions").select("id").eq("table_id", t.id).eq("status", "open").order("created_at", { ascending: false }).limit(1).single();
    if (sess) {
      const { data: o } = await s.from("orders").select("*, order_items(*)").eq("session_id", sess.id).order("created_at");
      setSessOrders(o ?? []);
    } else setSessOrders([]);
  };
  const markServed = async (o: any) => {
    await sb().rpc("update_order_status", { p_order: o.id, p_status: "served" });
    openSheet(sel);
  };
  const toggleAvail = async (m: any) => {
    await sb().from("menu_items").update({ available: !m.available }).eq("id", m.id);
    load();
  };
  const color: any = { free: "#EEF0F7", occupied: "#6D5EF8", ready: "#19C39A", bill: "#FFB020" };
  return <div>
    <h2 style={{ margin: "8px 0" }}>Floor Map</h2>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
      {tables.map((t: any) => <button key={t.id} onClick={() => openSheet(t)} style={{ background: color[t.status] ?? "#EEF0F7", border: sel?.id === t.id ? "3px solid #0F1222" : "0", borderRadius: 20, padding: 20, minHeight: 96, fontWeight: 800 }}>{t.label}<div style={{ fontSize: 12, fontWeight: 400 }}>{t.status}</div></button>)}
    </div>
    {sel && <div style={{ background: "#fff", borderRadius: 20, padding: 14, marginTop: 12 }}>
      <b>Table {sel.label}</b>
      {sessOrders.length === 0 && <p style={{ color: "#6B7186" }}>No active orders.</p>}
      {sessOrders.map((o: any) => <div key={o.id} style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: "monospace" }}>{o.id.slice(0, 8)} · ₹{((o.total_paise || 0) / 100).toFixed(0)}</span><b>{o.status}</b></div>
        {(o.order_items ?? []).map((it: any) => <div key={it.id} style={{ fontSize: 13 }}>{it.qty}× {it.name_snapshot}</div>)}
        {o.status === "ready" && <button onClick={() => markServed(o)} style={{ marginTop: 6, minHeight: 48, width: "100%", borderRadius: 12, border: 0, background: "#19C39A", color: "#fff", fontWeight: 800 }}>Swipe ✓ Mark Served</button>}
      </div>)}
    </div>}
    <h3>Menu availability (1-tap 86'd)</h3>
    {menu.map((m: any) => <div key={m.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#fff", borderRadius: 12, padding: "8px 12px", marginBottom: 6 }}><span>{m.name}</span><button onClick={() => toggleAvail(m)} style={{ minHeight: 44, borderRadius: 999, border: 0, padding: "0 16px", background: m.available ? "#19C39A" : "#F04438", color: "#fff", fontWeight: 700 }}>{m.available ? "Live" : "86'd"}</button></div>)}
  </div>;
}

// ---------- KITCHEN (KDS) ----------
function KitchenView({ restId }: { restId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  const [station, setStation] = useState("All");
  const load = async () => {
    const { data } = await sb().from("orders").select("*, order_items(*), tables(label)").eq("restaurant_id", restId).in("status", ["new", "preparing", "ready"]).order("created_at");
    setOrders(data ?? []);
  };
  useEffect(() => {
    load();
    const ch = sb().channel("kds:" + restId).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { sb().removeChannel(ch); };
  }, [restId]);
  const advance = async (o: any) => {
    const to = NEXT[o.status];
    if (to) await sb().rpc("update_order_status", { p_order: o.id, p_status: to });
  };
  const age = (iso: string) => Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  return <div>
    <h2 style={{ margin: "8px 0" }}>Kitchen KDS</h2>
    <div style={{ display: "flex", gap: 8, overflowX: "auto" }}>{["All", "Kitchen", "Tandoor", "Bar", "Dessert"].map((s) => <button key={s} onClick={() => setStation(s)} style={{ borderRadius: 999, padding: "10px 16px", background: station === s ? "#6D5EF8" : "#EEF0F7", color: station === s ? "#fff" : "#000", border: 0, fontWeight: 700, minHeight: 44 }}>{s}</button>)}</div>
    {(["new", "preparing", "ready"] as string[]).map((col) => <div key={col} style={{ marginTop: 12 }}><b style={{ textTransform: "uppercase" }}>{col}</b>
      {orders.filter((o) => o.status === col).map((o: any) => {
        const m = age(o.created_at);
        const tc = m >= 20 ? "#F04438" : m >= 10 ? "#FFB020" : "#6B7186";
        return <div key={o.id} style={{ background: "#fff", borderRadius: 16, padding: 12, marginTop: 8, borderLeft: `6px solid ${tc}` }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}><b style={{ fontFamily: "monospace" }}>#{o.id.slice(0, 6)} · {o.tables?.label}</b><b style={{ color: tc }}>{m}m</b></div>
          {(o.order_items ?? []).map((it: any) => <div key={it.id} style={{ fontSize: 18, fontWeight: 800 }}>{it.qty}× {it.name_snapshot}{it.note ? <span style={{ color: "#FFB020" }}> — {it.note}</span> : null}</div>)}
          {col !== "ready" ? <button onClick={() => advance(o)} style={{ marginTop: 8, minHeight: 48, width: "100%", borderRadius: 12, border: 0, background: "#0F1222", color: "#fff", fontWeight: 800 }}>1 · Advance to {NEXT[col]} ›</button>
            : <button onClick={() => advance(o)} style={{ marginTop: 8, minHeight: 48, width: "100%", borderRadius: 12, border: 0, background: "#19C39A", color: "#fff", fontWeight: 800 }}>3 · Ready → Served ✓</button>}
        </div>;
      })}</div>)}
  </div>;
}

// ---------- BILLING (cashier) ----------
function BillingView({ restId }: { restId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [sel, setSel] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [mode, setMode] = useState("upi");
  const [disc, setDisc] = useState(0);
  const [reason, setReason] = useState("");
  const [msg, setMsg] = useState("");
  const load = async (keep?: string) => {
    const s = sb();
    const { data: sess } = await s.from("table_sessions").select("*, tables(label)").eq("restaurant_id", restId).eq("status", "open").order("created_at", { ascending: false });
    setSessions(sess ?? []);
    const cur = (sess ?? []).find((x: any) => x.id === (keep ?? sel?.id)) ?? (sess ?? [])[0] ?? null;
    setSel(cur);
    if (cur) {
      const { data: o } = await s.from("orders").select("*, order_items(*)").eq("session_id", cur.id).neq("status", "cancelled").order("created_at");
      setOrders(o ?? []);
      setLines((o ?? []).flatMap((x: any) => x.order_items ?? []));
    } else { setOrders([]); setLines([]); }
  };
  useEffect(() => {
    load();
    const ch = sb().channel("bill:" + restId).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => load()).subscribe();
    return () => { sb().removeChannel(ch); };
  }, [restId]);
  const sub = lines.reduce((t: number, l: any) => t + l.price_paise * l.qty, 0);
  const total = sub - Math.round(sub * (disc || 0) / 100);
  const charge = async () => {
    if (!sel || total <= 0) return setMsg("Nothing to charge");
    if (disc > 0 && !reason.trim()) return setMsg("Discount reason required");
    const s = sb();
    for (const o of orders) {
      await s.from("payments").insert({ restaurant_id: restId, order_id: o.id, session_id: sel.id, mode, amount_paise: Math.round((o.total_paise || 0) * (1 - (disc || 0) / 100)), status: mode === "upi" ? "pending" : "paid" });
      if (mode !== "upi") await s.from("orders").update({ status: "paid" }).eq("id", o.id);
    }
    setMsg(mode === "upi" ? "UPI pending — webhook confirms (Phase 5)" : "Paid ✓");
    setDisc(0); setReason(""); load();
  };
  return <div>
    <h2 style={{ margin: "8px 0" }}>Billing · {sel?.tables?.label ?? "—"}</h2>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 8 }}>{sessions.map((t: any) => <button key={t.id} onClick={() => { setSel(t); load(t.id); }} style={{ borderRadius: 12, padding: "10px 14px", border: 0, background: sel?.id === t.id ? "#0F1222" : "#EEF0F7", color: sel?.id === t.id ? "#fff" : "#000", fontWeight: 700, minHeight: 44 }}>{t.tables?.label}</button>)}</div>
    {lines.map((l: any) => <div key={l.id} style={{ display: "flex", justifyContent: "space-between", background: "#fff", borderRadius: 10, padding: "8px 12px", marginBottom: 6 }}><span>{l.name_snapshot} × {l.qty}</span><b style={{ fontFamily: "monospace" }}>₹{((l.price_paise * l.qty) / 100).toFixed(0)}</b></div>)}
    <div style={{ marginTop: 8 }}>Disc <input value={disc} onChange={(e) => setDisc(+e.target.value || 0)} style={{ width: 52, minHeight: 44 }} />% <input placeholder="reason" value={reason} onChange={(e) => setReason(e.target.value)} style={{ minHeight: 44, borderRadius: 8, border: "1px solid #ddd", padding: "0 8px" }} /></div>
    <div style={{ fontSize: 26, fontWeight: 800, fontFamily: "monospace" }}>₹{(total / 100).toFixed(0)}</div>
    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>{["upi", "cash", "card", "credit"].map((m) => <button key={m} onClick={() => setMode(m)} style={{ flex: 1, minHeight: 48, borderRadius: 12, border: 0, background: mode === m ? "#6D5EF8" : "#EEF0F7", color: mode === m ? "#fff" : "#000", fontWeight: 700 }}>{m.toUpperCase()}</button>)}</div>
    <button onClick={charge} style={{ width: "100%", minHeight: 56, marginTop: 8, borderRadius: 14, border: 0, background: "#19C39A", color: "#fff", fontWeight: 800, fontSize: 18 }}>Charge</button>
    {msg && <div style={{ marginTop: 8, background: "#EEF0F7", borderRadius: 10, padding: 10 }}>{msg}</div>}
  </div>;
}

// ---------- ORDERS FEED ----------
function OrdersView({ restId }: { restId: string }) {
  const [orders, setOrders] = useState<any[]>([]);
  useEffect(() => {
    const load = async () => {
      const { data } = await sb().from("orders").select("*, tables(label)").eq("restaurant_id", restId).order("created_at", { ascending: false }).limit(30);
      setOrders(data ?? []);
    };
    load();
    const ch = sb().channel("feed:" + restId).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
    return () => { sb().removeChannel(ch); };
  }, [restId]);
  return <div><h2 style={{ margin: "8px 0" }}>Live orders</h2>
    {orders.map((o: any) => <div key={o.id} style={{ background: "#fff", borderRadius: 12, padding: 10, marginBottom: 8, display: "flex", justifyContent: "space-between" }}><span style={{ fontFamily: "monospace" }}>{o.tables?.label} · {o.id.slice(0, 8)} · ₹{((o.total_paise || 0) / 100).toFixed(0)}</span><b>{o.status}</b></div>)}
  </div>;
}

export default function App() {
  const [role, setRole] = useState<Role | null>(() => (localStorage.getItem("biz-role") as Role) || null);
  const [tab, setTab] = useState("floor");
  const restId = useRest();
  const pick = (r: Role) => { localStorage.setItem("biz-role", r); setRole(r); setTab(TABS[r][0]); };
  if (!role) return <div style={{ maxWidth: 480, margin: "0 auto", padding: 24, textAlign: "center" }}>
    <img src="/logo.png" alt="Aise Bites" style={{ width: 96, height: 96, borderRadius: 24 }} />
    <h2>Aise Bites Business</h2><p style={{ color: "#6B7186" }}>One app · pick your role (one-time setup)</p>
    {(["waiter", "kitchen", "cashier", "manager"] as Role[]).map((r) => <button key={r} onClick={() => pick(r)} style={{ display: "block", width: "100%", minHeight: 56, marginBottom: 10, borderRadius: 16, border: 0, background: "#0F1222", color: "#fff", fontWeight: 800, fontSize: 17, textTransform: "capitalize" }}>{r}</button>)}
    <p style={{ color: "#6B7186", fontSize: 12 }}>{footerText}</p>
  </div>;
  const tabs = TABS[role];
  const cur = tabs.includes(tab) ? tab : tabs[0];
  return <div style={{ maxWidth: 640, margin: "0 auto", background: "#F6F7FB", minHeight: "100vh", paddingBottom: 90 }}>
    <header style={{ position: "sticky", top: 0, zIndex: 5, backdropFilter: "blur(20px)", background: "rgba(255,255,255,.75)", padding: 12, borderBottom: "1px solid #E3E6F0", display: "flex", alignItems: "center", gap: 10 }}>
      <img src="/logo.png" alt="" style={{ width: 36, height: 36, borderRadius: 10 }} />
      <b style={{ textTransform: "capitalize" }}>{role}</b>
      <button onClick={() => { localStorage.removeItem("biz-role"); setRole(null); }} style={{ marginLeft: "auto", borderRadius: 999, border: "1px solid #E3E6F0", background: "#fff", padding: "8px 14px", fontWeight: 700 }}>Switch</button>
    </header>
    <main style={{ padding: 14 }}>
      {!restId ? <p>Connecting…</p> :
        cur === "floor" ? <FloorView restId={restId} /> :
        cur === "kitchen" ? <KitchenView restId={restId} /> :
        cur === "billing" ? <BillingView restId={restId} /> : <OrdersView restId={restId} />}
    </main>
    <nav style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: "rgba(15,18,34,.95)", backdropFilter: "blur(20px)", display: "flex", padding: "10px 12px calc(10px + env(safe-area-inset-bottom))" }}>
      {tabs.map((t) => <button key={t} onClick={() => setTab(t)} style={{ flex: 1, minHeight: 52, borderRadius: 14, border: 0, background: cur === t ? "#6D5EF8" : "transparent", color: "#fff", fontWeight: 800, textTransform: "capitalize" }}>{t}</button>)}
    </nav>
  </div>;
}
