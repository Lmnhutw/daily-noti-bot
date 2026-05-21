import { describe, expect, it } from "vitest";
import {
  normalizeSubscriptionTopic,
  symbolsForTopic,
} from "../src/services/instrument-registry.js";
import { selectableTopicsFromExisting } from "../src/messages/subscription.messages.js";

describe("subscription topics", () => {
  it("normalizes interactive subscription aliases", () => {
    expect(normalizeSubscriptionTopic("exchange rates")).toBe("exchange_rates");
    expect(normalizeSubscriptionTopic("crypto")).toBe("crypto");
    expect(normalizeSubscriptionTopic("stocks")).toBe("stocks");
  });

  it("keeps legacy subscription aliases", () => {
    expect(normalizeSubscriptionTopic("metals")).toBe("metals");
    expect(normalizeSubscriptionTopic("oil")).toBe("oil");
    expect(normalizeSubscriptionTopic("all")).toBe("all");
  });

  it("maps existing legacy rows into the interactive selection", () => {
    expect(selectableTopicsFromExisting(["all"])).toEqual(["gold", "fuel", "exchange_rates", "crypto", "stocks"]);
    expect(selectableTopicsFromExisting(["metals", "oil"])).toEqual(["gold", "fuel"]);
  });

  it("does not produce price symbols for future feed topics", () => {
    expect(symbolsForTopic("exchange_rates")).toEqual([]);
    expect(symbolsForTopic("crypto")).toEqual([]);
    expect(symbolsForTopic("stocks")).toEqual([]);
  });
});
