import type { Metadata } from "next";
export const metadata: Metadata = { title: "AiseServe Dashboard", description: "Scan. Order. Served. Smarter." };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body style={{ margin: 0, fontFamily: "Inter" }}>{children}</body></html>;
}
