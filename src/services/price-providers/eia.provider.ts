import axios from "axios";
import { env } from "../../config/env.js";
import type { CommoditySymbol, PriceQuote } from "../../types/domain.js";
import { instruments } from "../instrument-registry.js";

type UnknownRecord = Record<string, unknown>;

export class EiaProvider {
  async fetchQuote(symbol: CommoditySymbol): Promise<PriceQuote> {
    const instrument = instruments[symbol];

    if (instrument.provider !== "eia") {
      throw new Error(`${symbol} is not served by EIA`);
    }

    const baseUrl = env.EIA_API_BASE_URL.replace(/\/+$/, "");
    const url = `${baseUrl}/v2/seriesid/${instrument.providerSymbol}`;
    const params = new URLSearchParams();

    if (env.EIA_API_KEY) {
      params.set("api_key", env.EIA_API_KEY);
    }

    params.append("data[]", "value");
    params.set("sort[0][column]", "period");
    params.set("sort[0][direction]", "desc");
    params.set("length", "1");

    const response = await axios.get<unknown>(url, {
      params,
      timeout: env.HTTP_TIMEOUT_MS,
    });

    const data = asRecord(response.data);
    const responseBody = asRecord(data.response);
    const rows = responseBody.data;

    if (!Array.isArray(rows) || rows.length === 0) {
      throw new Error(`EIA returned no data for ${instrument.providerSymbol}`);
    }

    const latest = asRecord(rows[0]);
    const price = readNumber(latest, ["value", "price"]);
    const period = readString(latest, ["period"], undefined);

    return {
      symbol,
      name: instrument.displayName,
      price,
      currency: instrument.currency,
      unit: instrument.unit,
      source: instrument.sourceName,
      sourceUrl: url,
      observedAt: period ? periodToIso(period) : new Date().toISOString(),
    };
  }
}

function asRecord(value: unknown): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("EIA returned an invalid response");
  }

  return value as UnknownRecord;
}

function readNumber(data: UnknownRecord, keys: string[]): number {
  for (const key of keys) {
    const value = data[key];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const numberValue = Number(value);

    if (Number.isFinite(numberValue)) {
      return numberValue;
    }
  }

  throw new Error(`EIA response is missing numeric field ${keys.join("/")}`);
}

function readString(data: UnknownRecord, keys: string[], fallback: string | undefined): string | undefined {
  for (const key of keys) {
    const value = data[key];

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return fallback;
}

function periodToIso(period: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(period)) {
    return new Date(`${period}T00:00:00.000Z`).toISOString();
  }

  if (/^\d{4}-\d{2}$/.test(period)) {
    return new Date(`${period}-01T00:00:00.000Z`).toISOString();
  }

  if (/^\d{4}$/.test(period)) {
    return new Date(`${period}-01-01T00:00:00.000Z`).toISOString();
  }

  const parsed = new Date(period);

  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }

  return new Date().toISOString();
}
