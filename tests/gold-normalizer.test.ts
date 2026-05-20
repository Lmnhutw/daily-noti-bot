import { describe, expect, it } from "vitest";
import { normalizeApiGoldPrice } from "../src/providers/provider-utils.js";

describe("normalizeApiGoldPrice", () => {
  it("normalizes Mi Hong domestic per-chi prices to VND per luong", () => {
    const price = normalizeApiGoldPrice(
      [
        {
          buyingPrice: 16500000,
          sellingPrice: 16680000,
          code: "SJC",
          dateTime: "28/04/2026 14:02",
        },
      ],
      {
        providerId: "mihong",
        provider: "Mi Hong",
        sourceUrl: "https://api.mihong.vn/v1/gold-prices?market=domestic",
        preferredLabels: ["sjc"],
        currency: "VND",
        unit: "luong",
        market: "domestic",
      },
    );

    expect(price.buyPrice).toBe(165000000);
    expect(price.sellPrice).toBe(166800000);
    expect(price.updatedAt).toBe("2026-04-28T07:02:00.000Z");
    expect(price.metadata?.unit).toBe("luong");
  });

  it("normalizes giavang.now VND-per-luong API records", () => {
    const price = normalizeApiGoldPrice(
      {
        success: true,
        data: [
          {
            type_code: "SJL1L10",
            buy: 161300000,
            sell: 163800000,
            update_time: 1779100800,
          },
        ],
      },
      {
        providerId: "sjc",
        provider: "SJC",
        sourceUrl: "https://giavang.now/api/prices?type=SJL1L10",
        preferredLabels: ["sjl1l10"],
        currency: "VND",
        unit: "luong",
        market: "domestic",
      },
    );

    expect(price.buyPrice).toBe(161300000);
    expect(price.sellPrice).toBe(163800000);
    expect(price.metadata?.label).toBe("SJL1L10");
  });
});
