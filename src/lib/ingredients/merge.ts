import { convertQuantity, normalizeUnit, roundQuantity } from "@/lib/ingredients/units";

export type MergeTarget = {
  id: string;
  quantity: number;
  unit: string;
};

export type MergeResult = {
  targetId: string | null;
  mergedQuantity: number;
  mergedUnit: string;
  convertedIncomingQuantity: number;
};

export function findMergeTarget(
  existing: MergeTarget[],
  incomingQuantity: number,
  incomingUnit: string,
): MergeResult {
  const normalizedIncomingUnit = normalizeUnit(incomingUnit);

  for (const candidate of existing) {
    const converted = convertQuantity(incomingQuantity, normalizedIncomingUnit, candidate.unit);
    if (converted !== null) {
      return {
        targetId: candidate.id,
        mergedQuantity: roundQuantity(candidate.quantity + converted),
        mergedUnit: normalizeUnit(candidate.unit),
        convertedIncomingQuantity: roundQuantity(converted),
      };
    }
  }

  return {
    targetId: null,
    mergedQuantity: roundQuantity(incomingQuantity),
    mergedUnit: normalizedIncomingUnit,
    convertedIncomingQuantity: roundQuantity(incomingQuantity),
  };
}
