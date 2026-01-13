import { BggGame } from "@prisma/client"; // only for type reference in comments if needed

// More aggressive normalization for matching against BGG names.
// Shared between the linker and the alias map.
export function normalizeForMatch(name: string | null | undefined): string {
  if (!name) return "";

  const lowered = name.toLowerCase();

  return lowered
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\b(1st|2nd|3rd|[0-9]+th)\b/g, " ")
    .replace(/\b(ed|edition)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Simple alias map from normalized product names to canonical BGG names.
// Key: result of normalizeForMatch(product.name)
// Value: canonical BGG name as it appears in the BggGame dataset.
export const BGG_ALIAS_MAP: Record<string, string> = {
  // Examples – extend this map as you discover more edge cases.
  [normalizeForMatch("Sushi Go")]: "Sushi Go!",
  [normalizeForMatch("7 Wonders: Duel")]: "7 Wonders Duel",
  [normalizeForMatch("Spirit Island (Core Game)")]: "Spirit Island",
  [normalizeForMatch("Root: Riverfolk Expansion")]:
    "Root: The Riverfolk Expansion",
};
