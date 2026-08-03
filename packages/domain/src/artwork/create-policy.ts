import type { ArtworkType } from "../index";

const CREATABLE = new Set<ArtworkType>(["STUDY", "SKETCH", "PROJECT", "ARTWORK"]);

export function canCreateArtworkType(type: ArtworkType): boolean {
  return CREATABLE.has(type);
}

export function normalizeArtworkTitle(title: string): string {
  const normalized = title.trim().replace(/\s+/g, " ").slice(0, 200);
  if (!normalized) throw new Error("ARTWORK_TITLE_REQUIRED");
  return normalized;
}
