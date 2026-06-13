// Locally uploaded artwork served from /public/content
// Posters: 1024x1536 (2:3) — used for drama poster cards
// Banners: 1672x941 (~16:9) — used for hero banner backdrops

export const posterImages: string[] = Array.from(
  { length: 12 },
  (_, i) => `/content/posters/poster${String(i + 1).padStart(2, "0")}.png`
);

export const bannerImages: string[] = Array.from(
  { length: 5 },
  (_, i) => `/content/banners/banners${String(i + 1).padStart(2, "0")}.png`
);
