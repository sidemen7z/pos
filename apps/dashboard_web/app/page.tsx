"use client";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  LayoutDashboard, Store, ClipboardList, ChefHat, CalendarCheck, Armchair,
  Users, UtensilsCrossed, Receipt, ChartColumn, Settings, Search, Bell, SunMoon,
  Flame, IndianRupee,
} from "lucide-react";
// Aise Bites Owner Dashboard — bento layout (live Supabase data):
// icon rail · gradient KPIs · status donut · tables · month gauge · trending.
const sb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
const rs = (p: number) => `₹${((p || 0) / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const MONTH_TARGET = 50000000; // ₹5,00,000 paise — monthly sales goal

const NAV = [
  ["Dashboard", LayoutDashboard], ["POS", Store], ["Orders", ClipboardList], ["Kitchen", ChefHat],
  ["Reservation", CalendarCheck], ["Tables", Armchair], ["Customers", Users], ["Items", UtensilsCrossed],
  ["Invoices", Receipt], ["Reports", ChartColumn], ["Settings", Settings],
] as any[];

export default function Page() {
  const [kpi, setKpi] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());
  const [top, setTop] = useState<any[]>([]);
  const [monthRev, setMonthRev] = useState(0);
  const [err, setErr] = useState("");

  useEffect(() => {
    let ch: any;
    (async () => {
      try {
        const s = sb();
        const { data: r } = await s.from("restaurants").select("*").eq("slug", "aise-bites").single();
        if (!r) { setErr("Restaurant not found"); return; }
        const refresh = async () => {
          const { data: k } = await s.rpc("get_dashboard_kpis", { p_rest: r.id });
          setKpi(k);
          const { data: o } = await s.from("orders").select("*, tables(label)").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(60);
          setOrders(o ?? []);
          const { data: t } = await s.from("tables").select("*").eq("restaurant_id", r.id).order("label");
          setTables(t ?? []);
          const { data: sess } = await s.from("table_sessions").select("table_id").eq("restaurant_id", r.id).eq("status", "open");
          setOpenIds(new Set((sess ?? []).map((x: any) => x.table_id)));
          const start = new Date(); start.setDate(1); start.setHours(0, 0, 0, 0);
          const { data: mo } = await s.from("orders").select("total_paise").eq("restaurant_id", r.id).neq("status", "cancelled").gte("created_at", start.toISOString()).limit(1000);
          setMonthRev((mo ?? []).reduce((a: number, x: any) => a + (x.total_paise || 0), 0));
          const { data: oo } = await s.from("orders").select("id").eq("restaurant_id", r.id).neq("status", "cancelled").order("created_at", { ascending: false }).limit(120);
          const ids = (oo ?? []).map((x: any) => x.id);
          if (ids.length) {
            const { data: items } = await s.from("order_items").select("name_snapshot,qty,price_paise").in("order_id", ids);
            const agg: Record<string, any> = {};
            (items ?? []).forEach((it: any) => {
              const k2 = it.name_snapshot || "?";
              agg[k2] = agg[k2] || { name: k2, qty: 0, rev: 0 };
              agg[k2].qty += it.qty; agg[k2].rev += it.qty * (it.price_paise || 0);
            });
            setTop(Object.values(agg).sort((a: any, b: any) => b.rev - a.rev).slice(0, 4));
          }
        };
        await refresh();
        ch = s.channel("orders:dash:" + r.id).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, refresh).subscribe();
      } catch (e: any) { setErr(e.message); }
    })();
    return () => { if (ch) sb().removeChannel(ch); };
  }, []);

  const byStatus = useMemo(() => {
    const g: Record<string, number> = { new: 0, preparing: 0, ready: 0, served: 0, paid: 0 };
    orders.forEach((o) => { if (g[o.status] !== undefined) g[o.status]++; });
    return g;
  }, [orders]);
  const totSt = Object.values(byStatus).reduce((a: number, b: number) => a + (b as number), 0) || 1;
  const donut = `conic-gradient(#8A7DFF 0 ${(byStatus.new / totSt) * 360}deg, #FFB020 ${(byStatus.new / totSt) * 360}deg ${((byStatus.new + byStatus.preparing) / totSt) * 360}deg, #2EE6B6 ${((byStatus.new + byStatus.preparing) / totSt) * 360}deg ${((byStatus.new + byStatus.preparing + byStatus.ready) / totSt) * 360}deg, #2E90FA ${((byStatus.new + byStatus.preparing + byStatus.ready) / totSt) * 360}deg 360deg)`;
  const gaugePct = Math.min(100, Math.round((monthRev / MONTH_TARGET) * 100));
  const avg = kpi?.today_orders ? Math.round((kpi.today_revenue || 0) / kpi.today_orders) : 0;

  const kpis = [
    ["Total Orders", kpi?.today_orders ?? "…", "+live", "linear-gradient(135deg,#A855F7,#7C3AED)", ClipboardList],
    ["Total Sales", kpi ? rs(kpi.today_revenue) : "…", "today", "linear-gradient(135deg,#2E90FA,#1D4ED8)", IndianRupee],
    ["Average Value", kpi ? rs(avg) : "…", "per order", "linear-gradient(135deg,#F97316,#EA580C)", Flame],
    ["Active Tables", kpi?.active_tables ?? "…", "open now", "linear-gradient(135deg,#22C55E,#15803D)", Armchair],
  ] as any[];

  return <div className="odash">
    <style>{`
      *{box-sizing:border-box}body{margin:0}
      .odash{display:grid;grid-template-columns:96px 1fr;min-height:100vh;background:#F4F5FA;font-family:"Plus Jakarta Sans",Inter,"Segoe UI",system-ui,sans-serif;color:#0F1222}
      .rail{background:#0B0D14;color:#9AA1B8;display:flex;flex-direction:column;align-items:center;padding:16px 0;gap:6px;position:sticky;top:0;height:100vh}
      .rail img{width:44px;height:44px;border-radius:13px;margin-bottom:10px}
      .ritem{display:flex;flex-direction:column;align-items:center;gap:3px;font-size:10px;width:76px;padding:9px 0;border-radius:14px;border:0;background:transparent;color:#9AA1B8}
      .ritem.on{background:#1B2030;color:#FFC44D}
      .main{padding:22px 26px;overflow-x:hidden}
      .topbar{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px}
      .topbar h1{margin:0;font-size:28px;font-weight:800}
      .ticons{display:flex;gap:10px}
      .ticons button{width:44px;height:44px;border-radius:50%;border:1px solid #E3E6F0;background:#fff;display:flex;align-items:center;justify-content:center}
      .grid{display:grid;grid-template-columns:1.25fr 1fr;gap:18px}
      .krow{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .kpi{border-radius:22px;padding:20px;color:#fff;min-height:150px;display:flex;flex-direction:column;justify-content:space-between;box-shadow:0 14px 34px rgba(15,18,34,.16)}
      .kpi .lab{font-size:15px;opacity:.92}
      .kpi .big{font-size:34px;font-weight:800}
      .kpi .pill{background:rgba(255,255,255,.92);color:#15803D;font-weight:800;font-size:12px;border-radius:99px;padding:4px 12px;margin-left:10px;vertical-align:middle}
      .card{background:#fff;border-radius:22px;padding:20px;box-shadow:0 8px 26px rgba(15,18,34,.06)}
      .card h3{margin:0 0 4px;font-size:19px;display:flex;align-items:center;gap:10px}
      .card .view{margin-left:auto;font-size:13px;border:1px solid #E3E6F0;background:#fff;border-radius:10px;padding:7px 14px;font-weight:700}
      .srow{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #EEF0F7;font-weight:600}
      .srow .n{margin-left:auto;color:#6B7186;font-weight:700}
      .sdot{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff}
      .donut{width:170px;height:170px;border-radius:50%;margin:6px auto;position:relative;flex-shrink:0}
      .donut::after{content:"";position:absolute;inset:32px;background:#fff;border-radius:50%}
      .dwrap{display:flex;gap:8px;align-items:center}
      .legend{font-size:12px;color:#6B7186;display:flex;gap:12px;flex-wrap:wrap;margin-top:8px}
      .legend i{display:inline-block;width:9px;height:9px;border-radius:99px;margin-right:5px}
      .tables{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:12px}
      .ttile{border:2px solid #EEF0F7;border-radius:18px;padding:18px 10px;text-align:center;position:relative}
      .ttile.occ{border-color:#F04438}.ttile.free{border-color:#22C55E}
      .ttile b{font-size:20px;font-family:monospace}
      .ttile .st{position:absolute;top:10px;right:10px;width:10px;height:10px;border-radius:99px}
      .gauge{height:150px;border-radius:150px 150px 0 0;position:relative;overflow:hidden;margin-top:8px}
      .gauge .val{position:absolute;bottom:6px;left:0;right:0;text-align:center}
      .trend{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:12px}
      .dish{border:1px solid #EEF0F7;border-radius:16px;overflow:hidden}
      .dish .ph{height:86px;display:flex;align-items:center;justify-content:center;font-size:34px;color:#fff;font-weight:800}
      .dish .tx{padding:10px 12px;font-size:13px}.dish .tx b{display:block;font-size:14px}
      .feed{margin-top:18px}
      .feed .frow{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #EEF0F7;font-size:14px}
      @media(max-width:1100px){.grid{grid-template-columns:1fr}.trend{grid-template-columns:repeat(2,1fr)}}
      @media(max-width:720px){.odash{grid-template-columns:64px 1fr}.ritem{width:52px;font-size:0}.ritem svg{width:22px;height:22px}.main{padding:14px}.krow{grid-template-columns:1fr}.tables{grid-template-columns:repeat(2,1fr)}}
    `}</style>
    <aside className="rail">
      <img src="/logo.png" alt="Aise Bites" />
      {NAV.map(([n, I]: any) => <button key={n} className={n === "Dashboard" ? "ritem on" : "ritem"}><I size={21} />{n}</button>)}
    </aside>
    <main className="main">
      <div className="topbar"><h1>Dashboard</h1><div className="ticons"><button><Search size={19} /></button><button><SunMoon size={19} /></button><button><Bell size={19} /></button></div></div>
      {err && <div className="card" style={{ marginBottom: 14 }}>{err}</div>}
      <div className="grid">
        <div>
          <div className="krow">
            {kpis.map(([l, v, d, bg, I]: any) => <div key={l} className="kpi" style={{ background: bg }}><I size={30} /><div className="lab">{l}</div><div><span className="big">{v}</span><span className="pill">{d}</span></div></div>)}
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <h3><ClipboardList size={20} /> Live Tables <button className="view">View All</button></h3>
            <div className="legend"><span><i style={{ background: "#22C55E" }} />Free</span><span><i style={{ background: "#F04438" }} />Occupied</span></div>
            <div className="tables">
              {tables.slice(0, 6).map((t: any) => <div key={t.id} className={openIds.has(t.id) ? "ttile occ" : "ttile free"}><span className="st" style={{ background: openIds.has(t.id) ? "#F04438" : "#22C55E" }} /><b>{t.label}</b><div style={{ fontSize: 12, color: "#6B7186" }}>{openIds.has(t.id) ? "Occupied" : "Free"}</div></div>)}
            </div>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <h3><Flame size={20} /> Trending Dishes <button className="view">All Items</button></h3>
            <div className="trend">
              {top.length === 0 && <p style={{ color: "#6B7186" }}>No sales yet — trending appears here.</p>}
              {top.map((d: any, i: number) => <div key={d.name} className="dish"><div className="ph" style={{ background: ["linear-gradient(135deg,#A855F7,#7C3AED)", "linear-gradient(135deg,#2E90FA,#1D4ED8)", "linear-gradient(135deg,#F97316,#EA580C)", "linear-gradient(135deg,#22C55E,#15803D)"][i % 4] }}>🟢</div><div className="tx"><b>{d.name}</b>×{d.qty} · {rs(d.rev)}</div></div>)}
            </div>
          </div>
        </div>
        <div>
          <div className="card">
            <h3><ChartColumn size={20} /> Order Status <button className="view">View All</button></h3>
            <div className="dwrap">
              <div style={{ flex: 1 }}>
                {[["New", byStatus.new, "#8A7DFF"], ["Preparing", byStatus.preparing, "#FFB020"], ["Ready", byStatus.ready, "#2EE6B6"], ["Served+Paid", byStatus.served + byStatus.paid, "#2E90FA"]].map(([l, n, c]: any) => <div key={l} className="srow"><span className="sdot" style={{ background: c }}>{(l as string)[0]}</span>{l}<span className="n">{n} orders</span></div>)}
              </div>
              <div className="donut" style={{ background: donut }} />
            </div>
          </div>
          <div className="card" style={{ marginTop: 18 }}>
            <h3><IndianRupee size={20} /> Sales <button className="view">View Report</button></h3>
            <div className="gauge" style={{ background: `conic-gradient(from 270deg, #F97316 0 ${gaugePct * 1.8}deg, #EEF0F7 ${gaugePct * 1.8}deg 180deg, transparent 180deg)` }}>
              <div className="val"><div style={{ fontSize: 30, fontWeight: 800 }}>{gaugePct}%</div><div style={{ color: "#6B7186", fontSize: 13 }}>of {rs(MONTH_TARGET)} goal</div></div>
            </div>
            <div className="srow" style={{ marginTop: 10 }}><span className="sdot" style={{ background: "#2E90FA" }}>₹</span>This month<span className="n">{rs(monthRev)}</span></div>
          </div>
          <div className="card feed">
            <h3><Bell size={20} /> Live Orders</h3>
            {orders.slice(0, 6).map((o: any) => <div key={o.id} className="frow"><span style={{ fontFamily: "monospace" }}>{o.tables?.label} · {o.id.slice(0, 8)}</span><b>{o.status} · {rs(o.total_paise)}</b></div>)}
          </div>
        </div>
      </div>
    </main>
  </div>;
}
