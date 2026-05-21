import { describe, expect, it } from "vitest";
import {
  buildFuelApiUrl,
  normalizeGiaXangResponse,
} from "../src/services/price-providers/gia-xang-hom-nay.provider.js";

describe("GiaXangHomNayProvider helpers", () => {
  it("builds the date URL from template placeholders", () => {
    expect(
      buildFuelApiUrl("https://giaxanghomnay.com/api/pvdate/{{YYYY}}-{{MM}}-{{DD}}", "2026-04-20"),
    ).toBe("https://giaxanghomnay.com/api/pvdate/2026-04-20");
  });

  it("normalizes nested price groups", () => {
    const items = normalizeGiaXangResponse({
      value: [
        [
          {
            title: "Xăng RON 95-III",
            zone1_price: 23760,
            zone2_price: 24230,
            date: "2026-04-20 00:00:00",
          },
          {
            title: "DO 0,05S-II",
            zone1_price: 31040,
            zone2_price: 31660,
            date: "2026-04-20 00:00:00",
          },
        ],
      ],
    });

    expect(items).toEqual([
      expect.objectContaining({
        title: "Xăng RON 95-III",
        price: 23760,
        region: "VN-zone-1",
      }),
      expect.objectContaining({
        title: "DO 0,05S-II",
        price: 31040,
        region: "VN-zone-1",
      }),
    ]);
  });

  it("accepts the direct array shape returned to Axios", () => {
    const items = normalizeGiaXangResponse([
      [
        {
          title: "Xăng RON 95-III",
          zone1_price: 24070,
          date: "2026-05-21 00:00:00",
        },
      ],
    ]);

    expect(items[0]).toEqual(
      expect.objectContaining({
        title: "Xăng RON 95-III",
        price: 24070,
      }),
    );
  });
});
