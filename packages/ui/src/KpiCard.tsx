import React from "react";
export function KpiCard({ label, value, delta }: any) {
  return <div style={{ background: "#fff", borderRadius: 20, padding: 16, boxShadow: "0 4px 20px rgba(0,0,0,.06)" }}><div style={{ color: "#6B7186", fontSize: 12 }}>{label}</div><div style={{ fontSize: 24, fontWeight: 800 }}>{value}</div>{delta && <div style={{ fontSize: 12, color: "#19C39A" }}>{delta}</div>}</div>;
}
