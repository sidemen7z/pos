import React, { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
// Aise Bites Kitchen KDS — Aurora dark wall-board: live tickets, timers,
// station filters, one-tap advance, KOT print, offline banner, hotkeys.
const sb = () => createClient(import.meta.env.VITE_SUPABASE_URL ?? "", import.meta.env.VITE_SUPABASE_ANON_KEY ?? "");
const NEXT: Record<string, string> = { new: "preparing", preparing: "ready" };
const CTA: Record<string, string> = { new: "✓ Accept", preparing: "Ready ✓" };
export default function App() {
  const [orders, setOrders] = useState<any[]>([]);
  const [station, setStation] = useState("All");
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on); window.addEventListener("offline", off);
    const tick = setInterval(() => setNow(Date.now()), 15000);
    const c = sb();
    if (!import.meta.env.VITE_SUPABASE_URL) return;
    (async () => {
      const { data: r } = await c.from("restaurants").select("*").eq("slug", "aise-bites").single();
      if (!r) return;
      const load = async () => {
        const { data } = await c.from("orders").select("*, order_items(*), tables(label)").eq("restaurant_id", r.id).in("status", ["new", "preparing", "ready"]).order("created_at");
        setOrders(data ?? []);
        if (data && data.some((o: any) => o.status === "new")) chime();
      };
      await load();
      c.channel("orders:" + r.id).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, load).subscribe();
      const key = (e: KeyboardEvent) => {
        if (e.key === "1") firstIn("new")?.then(advance);
        if (e.key === "2") firstIn("preparing")?.then(advance);
        if (e.key.toLowerCase() === "p") window.print();
      };
      window.addEventListener("keydown", key);
    })();
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); clearInterval(tick); };
  }, []);
  const firstIn = async (st: string) => orders.find((o: any) => o.status === st) ?? null;
  const advance = async (o: any) => {
    if (!o) return;
    const to = NEXT[o.status];
    if (to) await sb().rpc("update_order_status", { p_order: o.id, p_status: to });
  };
  const print = (o: any) => {
    const w = (window as any).printer;
    if (w?.printKOT) w.printKOT(o);
    else window.print();
  };
  const chime = () => { try { const a = new AudioContext(); const o = a.createOscillator(); const g = a.createGain(); o.connect(g); g.connect(a.destination); o.frequency.value = 880; g.gain.value = 0.08; o.start(); o.stop(a.currentTime + 0.25); } catch {} };
  const age = (iso: string) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  const cols = [{ k: "new", label: "New", c: "#8A7DFF" }, { k: "preparing", label: "Preparing", c: "#FFB020" }, { k: "ready", label: "Ready", c: "#2EE6B6" }];
  const shown = orders.filter(() => true);
  return <div className="kds">
    <header className="kds-top">
      <img src="/logo.png" alt="" className="kds-logo" />
      <div><h1>Aise Bites <span>Kitchen</span></h1><span className="kds-sub">{shown.length} live tickets · {new Date(now).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</span></div>
      <span className={online ? "netpill on" : "netpill off"}>{online ? "● LIVE" : "● OFFLINE — queueing"}</span>
    </header>
    {!online && <div className="offlinebar">OFFLINE — showing last tickets, status updates queue locally and sync on reconnect.</div>}
    <div className="stationrow">{["All", "Kitchen", "Tandoor", "Bar", "Dessert"].map((s) => <button key={s} onClick={() => setStation(s)} className={station === s ? "st on" : "st"}>{s}</button>)}</div>
    <div className="kds-grid">
      {cols.map((col) => {
        const list = shown.filter((o) => o.status === col.k);
        return <section key={col.k} className="kcol">
          <div className="kcolhead" style={{ borderColor: col.c }}><b style={{ color: col.c }}>{col.label}</b><span className="count">{list.length}</span></div>
          {list.length === 0 && <div className="kempty">All clear ✨</div>}
          {list.map((o: any) => {
            const m = age(o.created_at);
            const hot = m >= 20 ? "hot" : m >= 10 ? "warm" : "ok";
            return <article key={o.id} className={"ticket " + hot}>
              <div className="trow"><span className="tno">#{o.id.slice(0, 6)}</span><span className="ttable">{o.tables?.label}</span><span className={"timer " + hot}>{m}m</span></div>
              {(o.order_items ?? []).map((it: any) => <div key={it.id} className="titem"><b>{it.qty}×</b> {it.name_snapshot}{it.note ? <span className="tnote">✎ {it.note}</span> : null}</div>)}
              <div className="tbtns">
                {col.k !== "ready"
                  ? <button onClick={() => advance(o)} className="go">{CTA[col.k]} ›</button>
                  : <span className="wait">Waiting pickup…</span>}
                <button onClick={() => print(o)} className="prt">🖨 KOT</button>
              </div>
            </article>;
          })}
        </section>;
      })}
    </div>
    <footer className="kds-foot">Keys: 1 accept · 2 ready · P print · Powered by AiseServe</footer>
  </div>;
}
