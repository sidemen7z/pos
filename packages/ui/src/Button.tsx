import React from "react";
export function Button({ children, variant = "primary", loading, ...p }: any) {
  const cls = variant === "primary"
    ? "background:linear-gradient(135deg,#6D5EF8,#3BC9DB);color:white"
    : variant === "danger" ? "background:#F04438;color:white" : "background:#EEF0F7;color:#0F1222";
  return <button {...p} style={{ minHeight: 48, borderRadius: 999, padding: "12px 20px", fontWeight: 700, border: 0, opacity: loading ? 0.6 : 1 }} data-style={cls}>{loading ? "..." : children}</button>;
}
