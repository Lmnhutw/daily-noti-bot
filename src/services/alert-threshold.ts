import type { AlertDirection } from "../types/domain.js";

export function isThresholdReached(direction: AlertDirection, threshold: number, currentPrice: number): boolean {
  return direction === "above" ? currentPrice >= threshold : currentPrice <= threshold;
}
