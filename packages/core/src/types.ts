// Shared domain types — money in integer paise, UUID PKs everywhere.
export type Role = "owner" | "manager" | "cashier" | "kitchen" | "waiter";
export type OrderStatus = "new" | "preparing" | "ready" | "served" | "paid" | "cancelled";
export type Diet = "veg" | "egg" | "nonveg" | "jain";

export interface Restaurant { id: string; slug: string; name: string; logo_url?: string; gstin?: string; fssai?: string; plan_id?: string; }
export interface Category { id: string; restaurant_id: string; name: string; sort: number; }
export interface MenuItem {
  id: string; restaurant_id: string; category_id: string;
  name: string; description?: string; price_paise: number;
  mrp_paise?: number; image_url?: string; diet: Diet;
  tags: string[]; prep_min: number; station: string;
  available: boolean; gst_rate: number; bestseller?: boolean; spicy?: number;
}
export interface TableRow { id: string; restaurant_id: string; floor?: string; label: string; token: string; status: string; }
export interface OrderItemInput { menu_item_id: string; qty: number; variant_id?: string; addon_ids?: string[]; note?: string; }
export const STATUS_COLOR: Record<string, string> = {
  new: "#6D5EF8", preparing: "#FFB020", ready: "#19C39A",
  served: "#2E90FA", paid: "#16a34a", cancelled: "#F04438",
};
export const paiseToRs = (p: number) => `₹${(p / 100).toFixed(2)}`;
