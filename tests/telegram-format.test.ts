import { describe, expect, it } from "vitest";
import { formatDailyUpdateMessage, formatQuoteLine } from "../src/utils/format.js";
import { bold, code, escapeHtml, stripTelegramHtml } from "../src/utils/telegram-format.js";
import type { PriceQuote } from "../src/types/domain.js";

const quote: PriceQuote = {
  symbol: "gold",
  name: "Gold <spot> & retail",
  price: 2345.67,
  currency: "USD",
  unit: "oz",
  source: "Provider <A>",
  sourceUrl: "https://example.com",
  observedAt: "2026-06-15T07:00:00.000Z",
  change: 1.25,
  changePercent: 0.5,
};

describe("telegram formatting", () => {
  it("escapes HTML in helper output", () => {
    expect(escapeHtml("A < B & C > D")).toBe("A &lt; B &amp; C &gt; D");
    expect(bold("A < B")).toBe("<b>A &lt; B</b>");
    expect(code("/alert gold > 2300")).toBe("<code>/alert gold &gt; 2300</code>");
  });

  it("formats quote lines with escaped dynamic text", () => {
    const message = formatQuoteLine(quote);

    expect(message).toContain("<b>Gold &lt;spot&gt; &amp; retail</b>");
    expect(message).toContain("<b>$2,345.67</b>");
    expect(message).not.toContain("Gold <spot>");
  });

  it("formats daily updates for Telegram HTML", () => {
    const message = formatDailyUpdateMessage("gold", [quote], ["Feed <down>"]);

    expect(message).toContain("<b>Daily update</b>");
    expect(message).toContain("Feed &lt;down&gt;");
  });

  it("strips Telegram HTML for Discord mirroring", () => {
    expect(stripTelegramHtml("<b>Daily update</b>: <code>gold &amp; fuel</code>")).toBe("Daily update: gold & fuel");
  });
});
