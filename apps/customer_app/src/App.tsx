import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Html5Qrcode } from "html5-qrcode";
import { createClient } from "@supabase/supabase-js";
import { BRAND, footerText, paiseToRs } from "@aiseserve/core";
import { DishCard, StatusBadge, EmptyState, Skeleton } from "@aiseserve/ui";
import { useCart } from "./store";

const sb = () => createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);
const DEFAULT_SLUG = import.meta.env.VITE_RESTAURANT_SLUG || "aise-bites";

// Parse our table QR: https://app.aise360.com/r/{slug}?t={token} (or a raw token)
export function parseQR(text: string): { slug: string; token: string } | null {
  const t = text.trim();
  try {
    if (/^https?:\/\//i.test(t)) {
      const u = new URL(t);
      const m = u.pathname.match(/\/r\/([^/?#]+)/);
      const token = u.searchParams.get("t") || "";
      if (m && token) return { slug: m[1], token };
    }
  } catch {}
  if (/^[A-Za-z0-9_-]{4,64}$/.test(t)) return { slug: DEFAULT_SLUG, token: t };
  return null;
}

// ---------- WELCOME ----------
const STR: Record<string, any> = {
  en: { scan: "Scan Table QR", manual: "Enter table code", start: "Start Ordering", tag: "Scan. Order. Served. Smarter." },
  hi: { scan: "टेबल QR स्कैन करें", manual: "टेबल कोड डालें", start: "ऑर्डर शुरू करें", tag: "स्कैन करें. ऑर्डर करें. पाएं. स्मarter." },
  mr: { scan: "टेबल QR स्कॅन करा", manual: "टेबल कोड टाका", start: "ऑर्डर सुरू करा", tag: "स्कॅन करा. ऑर्डर करा." },
};
function Welcome() {
  const nav = useNavigate();
  const [lang, setLang] = useState("en");
  const [code, setCode] = useState("");
  const s = STR[lang];
  return <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 24 }}>
    <img src="/logo.png" alt="Aise Bites" style={{ width: 120, height: 120, borderRadius: 28, boxShadow: "0 12px 40px rgba(0,0,0,.25)" }} />
    <h1 style={{ margin: "16px 0 4px", fontSize: 32 }}>Aise Bites</h1>
    <p style={{ color: "#6B7186", margin: "0 0 20px" }}>{s.tag}</p>
    <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>{["en", "hi", "mr"].map((l) => <button key={l} onClick={() => setLang(l)} style={{ minHeight: 44, borderRadius: 999, padding: "0 18px", border: 0, background: lang === l ? "#0F1222" : "#EEF0F7", color: lang === l ? "#fff" : "#000", fontWeight: 700 }}>{l.toUpperCase()}</button>)}</div>
    <button onClick={() => nav("/scan")} style={{ width: "100%", minHeight: 56, borderRadius: 18, border: 0, background: "linear-gradient(135deg,#6D5EF8,#3BC9DB)", color: "#fff", fontWeight: 800, fontSize: 18 }}>📷 {s.scan}</button>
    <div style={{ display: "flex", gap: 8, width: "100%", marginTop: 12 }}>
      <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={s.manual} style={{ flex: 1, minHeight: 52, borderRadius: 14, border: "1px solid #E3E6F0", padding: "0 14px", fontSize: 16 }} />
      <button onClick={() => { const p = parseQR(code); if (p) nav(`/r/${p.slug}?t=${p.token}`); else alert("Invalid code"); }} style={{ minHeight: 52, borderRadius: 14, border: 0, background: "#0F1222", color: "#fff", fontWeight: 800, padding: "0 20px" }}>{s.start}</button>
    </div>
    <p style={{ color: "#6B7186", fontSize: 12, marginTop: 24 }}>{footerText}</p>
  </div>;
}

// ---------- SCANNER ----------
function Scanner() {
  const nav = useNavigate();
  const [err, setErr] = useState("");
  useEffect(() => {
    const id = "qr-reader";
    const qr = new Html5Qrcode(id);
    let dead = false;
    qr.start({ facingMode: "environment" }, { fps: 10, qrbox: { width: 250, height: 250 } },
      (text) => {
        const p = parseQR(text);
        if (p && !dead) { dead = true; qr.stop().catch(() => {}); nav(`/r/${p.slug}?t=${p.token}`); }
        else if (!dead) setErr("Not an Aise Bites QR — try again");
      },
      () => {}
    ).catch(() => setErr("Camera blocked — allow camera permission, or enter the table code manually."));
    return () => { dead = true; qr.stop().catch(() => {}); qr.clear(); };
  }, []);
  return <div className="page" style={{ padding: 20, textAlign: "center" }}>
    <h2>Point at the table QR</h2>
    <div id="qr-reader" style={{ width: "100%", borderRadius: 20, overflow: "hidden", background: "#000" }} />
    {err && <p style={{ color: "#F04438" }}>{err}</p>}
    <button onClick={() => nav("/")} style={{ marginTop: 16, minHeight: 52, width: "100%", borderRadius: 14, border: "1px solid #E3E6F0", background: "#fff", fontWeight: 700 }}>← Back · enter code manually</button>
  </div>;
}

function useRestaurant(slug: string) {
  const [rest, setRest] = useState<any>(null);
  const [menu, setMenu] = useState<any[]>([]);
  const [cats, setCats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const c = sb();
      try {
        const cached = localStorage.getItem("menu:" + slug);
        if (cached) { const j = JSON.parse(cached); setMenu(j.menu); setCats(j.cats); setLoading(false); }
      } catch {}
      const { data: r } = await c.from("restaurants").select("*").eq("slug", slug).single();
      if (!r) { setLoading(false); return; }
      setRest(r);
      const { data: cts } = await c.from("categories").select("*").eq("restaurant_id", r.id).order("sort");
      const { data: items } = await c.from("menu_items").select("*").eq("restaurant_id", r.id).eq("available", true).order("name");
      setCats(cts ?? []); setMenu(items ?? []); setLoading(false);
      localStorage.setItem("menu:" + slug, JSON.stringify({ menu: items, cats: cts }));
      c.channel("menu:" + r.id).on("postgres_changes", { event: "*", schema: "public", table: "menu_items" }, (p: any) => {
        setMenu((m) => p.eventType === "UPDATE" && p.new.available === false ? m.filter((x) => x.id !== p.new.id) : m);
      }).subscribe();
    })();
  }, [slug]);
  return { rest, menu, cats, loading };
}

function MenuPage() {
  const [sp] = useSearchParams();
  const { slug } = useParams();
  const realSlug = slug || DEFAULT_SLUG;
  const tableToken = sp.get("t") ?? "walk-in";
  const { rest, menu, cats, loading } = useRestaurant(realSlug);
  const [q, setQ] = useState(""); const [diet, setDiet] = useState("all");
  const [cat, setCat] = useState<string>("all");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const cart = useCart() as any;
  const total = cart.lines.reduce((s: number, l: any) => s + l.price_paise * l.qty, 0);

  const filtered = useMemo(() => menu.filter((m) =>
    (cat === "all" || m.category_id === cat) &&
    (diet === "all" || m.diet === diet) &&
    (q === "" || (m.name + m.description).toLowerCase().includes(q.toLowerCase()))), [menu, cat, diet, q]);

  useEffect(() => {
    (async () => {
      if (!rest) return;
      const c = sb();
      const { data: t } = await c.from("tables").select("*").eq("restaurant_id", rest.id).eq("token", tableToken).single();
      const tableId = t?.id ?? (await c.from("tables").select("*").eq("restaurant_id", rest.id).limit(1).single()).data?.id;
      await c.auth.signInAnonymously();
      let { data: s } = await c.from("table_sessions").select("*").eq("table_id", tableId).eq("status", "open").order("created_at", { ascending: false }).limit(1).single();
      if (!s) { const { data: ns } = await c.from("table_sessions").insert({ restaurant_id: rest.id, table_id: tableId }).select().single(); s = ns; }
      setSessionId(s.id);
      c.channel("session:" + s.id).on("postgres_changes", { event: "*", schema: "public", table: "orders" }, async (p: any) => {
        if (p.new?.session_id === s.id) { setOrderId(p.new.id); setStatus(p.new.status); }
      }).subscribe();
    })();
  }, [rest]);

  const placeOrder = async (payLater = true) => {
    const c = sb();
    const items = cart.lines.map((l: any) => ({ menu_item_id: l.id, qty: l.qty }));
    let oid = null;
    const { data, error } = await c.rpc("place_order", { p_session: sessionId, p_items: items });
    if (!error) oid = data;
    else {
      const { data: o } = await c.from("orders").insert({ restaurant_id: rest.id, session_id: sessionId, subtotal_paise: total, total_paise: total }).select().single();
      oid = o.id;
      for (const l of cart.lines) await c.from("order_items").insert({ order_id: oid, menu_item_id: l.id, name_snapshot: l.name, price_paise: l.price_paise, qty: l.qty });
    }
    setOrderId(oid); setStatus("new"); cart.clear();
    if (!payLater) alert("UPI via Razorpay plugs into Edge Function create-payment (Phase 5). Using Pay at Counter for now.");
  };

  if (loading) return <div className="page" style={{ padding: 16, display: "grid", gap: 12 }}><Skeleton /><Skeleton /><Skeleton /></div>;

  return (
    <div className="page" style={{ paddingBottom: 120 }}>
      <header className="sticky">
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}><img src="/logo.png" alt="Aise Bites" style={{ width: 40, height: 40, borderRadius: 12, objectFit: "cover" }} /><div><b>{rest?.name ?? "Aise Bites"}</b><div className="muted">Table {tableToken.slice(0, 4)} · Powered by AiseServe</div></div></div>
        <input className="search" placeholder="Search paneer, biryani…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="chips">
          {["all", "veg", "nonveg", "jain", "egg"].map((d) => <button key={d} onClick={() => setDiet(d)} className={diet === d ? "pill on-dark" : "pill"}>{d}</button>)}
        </div>
        <div className="chips">
          <button onClick={() => setCat("all")} className={cat === "all" ? "pill on-brand" : "pillCard"}>All</button>
          {cats.map((c: any) => <button key={c.id} onClick={() => setCat(c.id)} className={cat === c.id ? "pill on-brand" : "pillCard"}>{c.name}</button>)}
        </div>
      </header>
      <main style={{ padding: 14, display: "grid", gap: 12 }}>
        {filtered.length === 0 && <EmptyState title="No dishes found" hint="Try another search or filter" />}
        {filtered.map((m: any) => <DishCard key={m.id} item={m} onAdd={(it: any) => cart.add(it)} />)}
      </main>
      {orderId && (
        <div style={{ margin: 14, background: "#fff", borderRadius: 20, padding: 16 }}>
          <b>Live tracker</b> <StatusBadge status={status ?? "new"} />
          <div className="muted" style={{ marginTop: 6 }}>Received › Preparing › Ready › Served · Order <span style={{ fontFamily: "monospace" }}>{String(orderId).slice(0, 8)}</span></div>
          <div className="tracker-steps">
            {["new", "preparing", "ready", "served"].map((s, i, a) => <span key={s} className={a.indexOf(status ?? "new") >= i ? "dot done" : "dot"} />)}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button className="btn-ghost">Call waiter</button>
            <button className="btn-dark">Request bill</button>
          </div>
        </div>
      )}
      {cart.lines.length > 0 && (
        <div className="cartbar">
          <div><b>{cart.lines.reduce((s: number, l: any) => s + l.qty, 0)} items</b><div style={{ fontFamily: "monospace" }}>{paiseToRs(total)}</div>
            <div style={{ fontSize: 12, opacity: .7 }}>{cart.lines.map((l: any) => `${l.name}×${l.qty}`).join(", ").slice(0, 60)}</div></div>
          <button onClick={() => placeOrder(true)} className="btn-grad">Place · Pay later</button>
        </div>
      )}
      <footer style={{ textAlign: "center", color: "#6B7186", fontSize: 12, padding: 20 }}>{footerText} · {BRAND.tagline}</footer>
    </div>
  );
}

export default function App() {
  return <Routes><Route path="/" element={<Welcome />} /><Route path="/scan" element={<Scanner />} /><Route path="/r/:slug" element={<MenuPage />} /><Route path="*" element={<Welcome />} /></Routes>;
}
