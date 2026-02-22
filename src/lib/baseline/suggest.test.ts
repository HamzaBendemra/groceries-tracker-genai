import { describe, expect, it } from "vitest";
import { normalizeSuggestedBaselineItems, toSafeQuantity } from "@/lib/baseline/suggest";

describe("toSafeQuantity", () => {
  it("keeps valid numeric quantities", () => {
    expect(toSafeQuantity(2)).toBe(2);
    expect(toSafeQuantity(750)).toBe(750);
  });

  it("parses numeric strings and strips unit characters", () => {
    expect(toSafeQuantity("500")).toBe(500);
    expect(toSafeQuantity("1000g")).toBe(1000);
  });

  it("falls back to 1 for invalid values", () => {
    expect(toSafeQuantity("")).toBe(1);
    expect(toSafeQuantity("abc")).toBe(1);
    expect(toSafeQuantity(0)).toBe(1);
  });

  it("clamps extreme quantities", () => {
    expect(toSafeQuantity(15000)).toBe(10000);
    expect(toSafeQuantity("99999")).toBe(10000);
  });
});

describe("normalizeSuggestedBaselineItems", () => {
  it("deduplicates case-insensitively and trims names", () => {
    const normalized = normalizeSuggestedBaselineItems(
      [
        { name: " Milk ", quantity: 2, unit: "l" },
        { name: "milk", quantity: 3, unit: "l" },
        { name: "Eggs", quantity: 12, unit: "unit" },
      ],
      40,
    );

    expect(normalized).toEqual([
      { name: "Milk", quantity: 2, unit: "l" },
      { name: "Eggs", quantity: 12, unit: "unit" },
    ]);
  });

  it("applies a hard max item cap", () => {
    const items = Array.from({ length: 60 }, (_, index) => ({
      name: `Item ${index + 1}`,
      quantity: 1,
      unit: "unit",
    }));

    const normalized = normalizeSuggestedBaselineItems(items, 40);
    expect(normalized).toHaveLength(40);
    expect(normalized[0]?.name).toBe("Item 1");
    expect(normalized[39]?.name).toBe("Item 40");
  });
});
