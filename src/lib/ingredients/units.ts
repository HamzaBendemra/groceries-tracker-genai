export type UnitDimension = "volume" | "weight" | "count" | "unknown";

export type CanonicalUnit = {
  canonical: string;
  dimension: UnitDimension;
  toBase: number;
};

const unitAliases: Record<string, CanonicalUnit> = {
  tsp: { canonical: "tsp", dimension: "volume", toBase: 4.92892 },
  teaspoon: { canonical: "tsp", dimension: "volume", toBase: 4.92892 },
  teaspoons: { canonical: "tsp", dimension: "volume", toBase: 4.92892 },
  tbsp: { canonical: "tbsp", dimension: "volume", toBase: 14.7868 },
  tablespoon: { canonical: "tbsp", dimension: "volume", toBase: 14.7868 },
  tablespoons: { canonical: "tbsp", dimension: "volume", toBase: 14.7868 },
  cup: { canonical: "cup", dimension: "volume", toBase: 240 },
  cups: { canonical: "cup", dimension: "volume", toBase: 240 },
  ml: { canonical: "ml", dimension: "volume", toBase: 1 },
  milliliter: { canonical: "ml", dimension: "volume", toBase: 1 },
  milliliters: { canonical: "ml", dimension: "volume", toBase: 1 },
  l: { canonical: "l", dimension: "volume", toBase: 1000 },
  liter: { canonical: "l", dimension: "volume", toBase: 1000 },
  liters: { canonical: "l", dimension: "volume", toBase: 1000 },
  "fl oz": { canonical: "fl oz", dimension: "volume", toBase: 29.5735 },
  floz: { canonical: "fl oz", dimension: "volume", toBase: 29.5735 },
  g: { canonical: "g", dimension: "weight", toBase: 1 },
  gram: { canonical: "g", dimension: "weight", toBase: 1 },
  grams: { canonical: "g", dimension: "weight", toBase: 1 },
  kg: { canonical: "kg", dimension: "weight", toBase: 1000 },
  kilogram: { canonical: "kg", dimension: "weight", toBase: 1000 },
  kilograms: { canonical: "kg", dimension: "weight", toBase: 1000 },
  oz: { canonical: "oz", dimension: "weight", toBase: 28.3495 },
  ounce: { canonical: "oz", dimension: "weight", toBase: 28.3495 },
  ounces: { canonical: "oz", dimension: "weight", toBase: 28.3495 },
  lb: { canonical: "lb", dimension: "weight", toBase: 453.592 },
  lbs: { canonical: "lb", dimension: "weight", toBase: 453.592 },
  pound: { canonical: "lb", dimension: "weight", toBase: 453.592 },
  pounds: { canonical: "lb", dimension: "weight", toBase: 453.592 },
  unit: { canonical: "unit", dimension: "count", toBase: 1 },
  units: { canonical: "unit", dimension: "count", toBase: 1 },
  piece: { canonical: "unit", dimension: "count", toBase: 1 },
  pieces: { canonical: "unit", dimension: "count", toBase: 1 },
  pc: { canonical: "unit", dimension: "count", toBase: 1 },
  pcs: { canonical: "unit", dimension: "count", toBase: 1 },
  clove: { canonical: "clove", dimension: "count", toBase: 1 },
  cloves: { canonical: "clove", dimension: "count", toBase: 1 },
  egg: { canonical: "egg", dimension: "count", toBase: 1 },
  eggs: { canonical: "egg", dimension: "count", toBase: 1 },
};

function normalizeUnitToken(input: string): string {
  return input.toLowerCase().replace(/\./g, "").trim();
}

export function canonicalizeUnit(input?: string | null): CanonicalUnit {
  if (!input) {
    return unitAliases.unit;
  }

  const normalized = normalizeUnitToken(input);
  return unitAliases[normalized] ?? {
    canonical: normalized,
    dimension: "unknown",
    toBase: 1,
  };
}

export function canConvertUnits(fromUnit?: string | null, toUnit?: string | null): boolean {
  const from = canonicalizeUnit(fromUnit);
  const to = canonicalizeUnit(toUnit);

  if (from.dimension === "unknown" || to.dimension === "unknown") {
    return from.canonical === to.canonical;
  }

  if (from.dimension !== to.dimension) {
    return false;
  }

  if (from.dimension === "count") {
    return (
      from.canonical === to.canonical ||
      from.canonical === "unit" ||
      to.canonical === "unit"
    );
  }

  return true;
}

export function convertQuantity(
  quantity: number,
  fromUnit?: string | null,
  toUnit?: string | null,
): number | null {
  const from = canonicalizeUnit(fromUnit);
  const to = canonicalizeUnit(toUnit);

  if (!canConvertUnits(from.canonical, to.canonical)) {
    return null;
  }

  if (from.canonical === to.canonical) {
    return quantity;
  }

  const base = quantity * from.toBase;
  return base / to.toBase;
}

export function normalizeUnit(input?: string | null): string {
  return canonicalizeUnit(input).canonical;
}

export function roundQuantity(value: number): number {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}
