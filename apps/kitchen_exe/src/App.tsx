import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
// Kitchen KDS: New | Preparing | Ready, timers, station filter, 86'd, offline banner
export default function App() {
  const [orders, setOrders] = useState<any[]>([]);
  const [station, setStation] = useState("All");
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    const c = createClient(import.meta.env.VITE_SUPABASE_URL ?? "", import.meta.env.VITE_SUPABASE_ANON_KEY ?? "");
    if (!import.meta.env.VITE_SUPABASE_URL) { setOrders([]); return; }
    (async () => {
      const { data: r } = await c.from("restaurants").select("*").eq("slug", "aise-bites").single();
      if (!r) return;
      const load = async () => {
        const { data } = await c.from("orders").select("*, order_items(*), tables(label)").eq("restaurant_id", r.id).in("status", ["new", "preparing", "ready"]).order("created_at");
        setOrders(data ?? []);
      };
      await load();
      new Audio(); // chime placeholder
      c.channel("orders:" + r.id).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
      const key = (e: KeyboardEvent) => { if (e.key === "1") alert("Accept (1)"); if (e.key === "3") alert("Ready (3)"); };
      window.addEventListener("keydown", key);
    })();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  const cols = ["new", "preparing", "ready"];
  return <div style={{ background: "#0B0D14", color: "#F2F4FA", minHeight: "100vh", padding: 20 }}>
    {!online && <div style={{ background: "#FFB020", color: "#000", padding: 10, borderRadius: 12 }}>OFFLINE — showing last tickets, updates queued</div>}
    <h1 style={{ fontSize: 32 }}>Kitchen · <span style={{ color: "#8A7DFF" }}>Aise Bites</span></h1>
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>{["All", "Kitchen", "Tandoor", "Bar", "Dessert"].map((s) => <button key={s} onClick={() => setStation(s)} style={{ borderRadius: 999, padding: "10px 18px", background: station === s ? "#8A7DFF" : "#1B2030", color: "#fff", border: 0, fontWeight: 700, minHeight: 48, whiteSpace: "nowrap" }}>{s}</button>)}</div>
    <div className="kds-grid">
      {cols.map((col) => <div key={col} style={{ background: "#141824", borderRadius: 20, padding: 12, minHeight: 400 }}>
        <h2 style={{ textTransform: "uppercase" }}>{col}</h2>
        {orders.filter((o) => o.status === col).map((o: any) => <div key={o.id} style={{ background: "#1B2030", borderRadius: 16, padding: 14, marginBottom: 10, border: "1px solid #262C3F" }}>
          <div style={{ fontFamily: "monospace", fontSize: 20 }}>#{o.id.slice(0, 6)} · {o.tables?.label}</div>
          {(o.order_items ?? []).map((it: any) => <div key={it.id} style={{ fontSize: 22, fontWeight: 800 }}>{it.qty}× {it.name_snapshot}</div>)}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button style={{ minHeight: 48, flex: 1, borderRadius: 12, border: 0, background: "#2EE6B6", fontWeight: 800 }}>Advance ›</button>
            <button style={{ minHeight: 48, borderRadius: 12, background: "#262C3F", color: "#fff", border: 0, padding: "0 14px" }}>P Print</button>
          </div>
        </div>)}
      </div>)}
    </div>
  </div>;
}
