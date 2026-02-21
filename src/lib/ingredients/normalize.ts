const stopWords = new Set([
  "fresh",
  "large",
  "small",
  "medium",
  "optional",
  "organic",
  "ripe",
  "chopped",
  "sliced",
  "diced",
  "minced",
]);

export function normalizeIngredientName(input: string): string {
  const cleaned = input
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const tokens = cleaned
    .split(" ")
    .filter(Boolean)
    .filter((token) => !stopWords.has(token))
    .map((token) => token.replace(/ies$/, "y").replace(/s$/, ""));

  return tokens.join(" ").trim();
}
