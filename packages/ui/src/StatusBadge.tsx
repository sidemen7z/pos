import React from "react";
const STATUS_COLOR: Record<string, string> = { new: "#6D5EF8", preparing: "#FFB020", ready: "#19C39A", served: "#2E90FA", paid: "#16a34a", cancelled: "#F04438" };
export function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLOR[status] ?? "#666";
  return <span style={{ background: c + "22", color: c, borderRadius: 999, padding: "4px 12px", fontWeight: 700, fontSize: 12 }}>● {status}</span>;
}
