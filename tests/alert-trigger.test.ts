import { describe, expect, it } from "vitest";
import { isThresholdReached } from "../src/services/alert-threshold.js";

describe("isThresholdReached", () => {
  it("triggers above alerts at or above the threshold", () => {
    expect(isThresholdReached("above", 100, 100)).toBe(true);
    expect(isThresholdReached("above", 100, 100.01)).toBe(true);
    expect(isThresholdReached("above", 100, 99.99)).toBe(false);
  });

  it("triggers below alerts at or below the threshold", () => {
    expect(isThresholdReached("below", 100, 100)).toBe(true);
    expect(isThresholdReached("below", 100, 99.99)).toBe(true);
    expect(isThresholdReached("below", 100, 100.01)).toBe(false);
  });
});
