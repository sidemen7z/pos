import React from "react";
export function EmptyState({ title = "Nothing here", hint = "" }: any) {
  return <div style={{ textAlign: "center", padding: 40, color: "#6B7186" }}><div style={{ fontSize: 40 }}>🍽️</div><h3>{title}</h3><p>{hint}</p></div>;
}
export function Skeleton({ h = 88 }: any) {
  return <div style={{ height: h, borderRadius: 20, background: "linear-gradient(90deg,#EEF0F7,#F6F7FB,#EEF0F7)", animation: "pulse 1.2s infinite" }} />;
}
