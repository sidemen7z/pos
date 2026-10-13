import { create } from "zustand";
export const useCart = create<any>((set) => ({
  lines: [] as { id: string; name: string; price_paise: number; qty: number }[],
  add: (item: any) => set((s: any) => {
    const f = s.lines.find((l: any) => l.id === item.id);
    if (f) return { lines: s.lines.map((l: any) => l.id === item.id ? { ...l, qty: l.qty + 1 } : l) };
    return { lines: [...s.lines, { id: item.id, name: item.name, price_paise: item.price_paise, qty: 1 }] };
  }),
  dec: (id: string) => set((s: any) => ({ lines: s.lines.map((l: any) => l.id === id ? { ...l, qty: l.qty - 1 } : l).filter((l: any) => l.qty > 0) })),
  clear: () => set({ lines: [] }),
}));
