export const BRAND = {
  name: "AiseServe",
  company: "Aise360",
  tagline: "Scan. Order. Served. Smarter.",
  website: "https://aise360.com",
  appDomain: "https://app.aise360.com",
  dashboardDomain: "https://dashboard.aise360.com",
  apiDomain: "https://api.aise360.com",
  supportEmail: "contact@aise360.com",
  noReplyEmail: "no-reply@aise360.com",
  whatsapp: "+91XXXXXXXXXX",
  restaurantSubdomain: "{slug}.aise360.com",
} as const;

export const qrUrl = (slug: string, tableToken: string) =>
  `${BRAND.appDomain}/r/${slug}?t=${tableToken}`;

export const footerText = `Powered by ${BRAND.name} | aise360.com`;
export const receiptFooter = `Powered by ${BRAND.name}, aise360.com`;
export const allowedOrigins = [
  BRAND.website,
  BRAND.appDomain,
  BRAND.dashboardDomain,
  "http://localhost:5173",
  "http://localhost:3000",
];
