import React from "react";
const DOT: Record<string, string> = { veg: "🟢", egg: "🟡", nonveg: "🔴", jain: "🟢" };
export function DishCard({ item, onAdd }: any) {
  return (
    <div style={{ background: "#fff", borderRadius: 20, padding: 12, display: "flex", gap: 12, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}>
      <div style={{ width: 88, height: 88, borderRadius: 14, background: "#EEF0F7", overflow: "hidden", flexShrink: 0 }}>
        {item.image_url ? <img src={item.image_url} alt={item.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ padding: 20 }}>🍛</div>}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 800 }}>{(DOT as any)[item.diet] ?? "🟢"} {item.name}</div>
        <div style={{ color: "#6B7186", fontSize: 13 }}>{item.description?.slice(0, 60)}</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
          <b style={{ fontFamily: "monospace" }}>₹{(item.price_paise / 100).toFixed(0)}</b>
          {item.available === false ? <span>Sold out</span> : <button onClick={() => onAdd?.(item)} style={{ minHeight: 48, borderRadius: 999, padding: "8px 18px", background: "#6D5EF8", color: "#fff", border: 0, fontWeight: 700 }}>ADD +</button>}
        </div>
      </div>
    </div>
  );
}
