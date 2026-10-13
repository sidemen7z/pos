"use client";
import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { BRAND, footerText } from "@aiseserve/core";
// Owner Dashboard (LIVE): KPIs from get_dashboard_kpis RPC + live orders feed.
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
export default function Page() {
  const [kpi, setKpi] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [err, setErr] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const s = sb();
        const { data: r } = await s.from("restaurants").select("*").eq("slug", "aise-bites").single();
        if (!r) { setErr("Restaurant not found"); return; }
        const { data: k } = await s.rpc("get_dashboard_kpis", { p_rest: r.id });
        setKpi(k);
        const { data: o } = await s.from("orders").select("*, tables(label)").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(15);
        setOrders(o ?? []);
        s.channel("orders:dash:" + r.id).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async () => {
          const { data: k2 } = await s.rpc("get_dashboard_kpis", { p_rest: r.id });
          setKpi(k2);
          const { data: o2 } = await s.from("orders").select("*, tables(label)").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(15);
          setOrders(o2 ?? []);
        }).subscribe();
      } catch (e: any) { setErr(e.message); }
    })();
  }, []);
  const rs = (p: number) => `₹${((p || 0) / 100).toLocaleString("en-IN")}`;
  const cards = [
    ["Revenue today", kpi ? rs(kpi.today_revenue) : "…", "live"],
    ["Orders today", kpi?.today_orders ?? "…", "live"],
    ["Active tables", kpi?.active_tables ?? "…", "open sessions"],
  ];
  return <div className="dash">
    <style>{`.dash{display:grid;grid-template-columns:220px 1fr;min-height:100vh}*{box-sizing:border-box}body{margin:0}@media(max-width:760px){.dash{grid-template-columns:1fr}}`}</style>
    <aside style={{ background: "#0F1222", color: "#fff", padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src="/logo.png" alt="Aise Bites" style={{ width: 36, height: 36, borderRadius: 10 }} /><div><b>Aise Bites</b><div style={{ fontSize: 12, opacity: .6 }}>{BRAND.tagline}</div></div></div>
      {["Overview", "Live Orders", "Menu", "Tables & QR", "Analytics", "AI Insights", "Staff", "Settings", "Super Admin"].map((m) => <div key={m} style={{ padding: "10px 12px", borderRadius: 12, background: m === "Overview" ? "#6D5EF8" : "transparent", marginTop: 4 }}>{m}</div>)}
    </aside>
    <main style={{ background: "#F6F7FB", padding: 24 }}>
      <h1>Today · Aise Bites (live)</h1>
      {err && <div style={{ background: "#F0443822", padding: 12, borderRadius: 12 }}>{err}</div>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12 }}>
        {cards.map(([l, v, d]) => <div key={l} style={{ background: "#fff", borderRadius: 20, padding: 16 }}><div style={{ color: "#6B7186", fontSize: 12 }}>{l}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{v}</div><div style={{ fontSize: 12, color: "#19C39A" }}>{d}</div></div>)}
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: 16, marginTop: 16 }}>
        <b>Live orders</b>
        {orders.length === 0 && <p style={{ color: "#6B7186" }}>No orders yet today — place one from the customer app.</p>}
        {orders.map((o: any) => <div key={o.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #eee" }}><span style={{ fontFamily: "monospace" }}>{o.id.slice(0, 8)} · {o.tables?.label ?? ""}</span><b>{o.status} · {rs(o.total_paise)}</b></div>)}
      </div>
      <div style={{ background: "#fff", borderRadius: 20, padding: 16, marginTop: 16 }}>
        <b>AI Insights</b>
        <ul><li>Paneer Tikka sells 40% more on Fridays. Stock up.</li><li>Dessert attach 12% — a prompt could add ~₹18,000/mo.</li></ul>
      </div>
      <p style={{ color: "#6B7186", fontSize: 12 }}>{footerText} · {BRAND.dashboardDomain}</p>
    </main>
  </div>;
}
