import type { Prisma } from "@prisma/client";
import type { DatabaseClient } from "../storage/database.js";

export type ReportPeriod = "week" | "month" | "year";

export interface GoldPriceInput {
  source: string;
  buyPrice: number;
  sellPrice: number;
  unit: string;
  rawJson: unknown;
}

export interface FuelPriceInput {
  source: string;
  fuelType: string;
  price: number;
  region: string;
  rawJson: unknown;
}

export interface GoldPriceRow {
  id: number;
  source: string;
  buy_price: number;
  sell_price: number;
  unit: string;
  raw_json: string;
  created_at: string;
}

export interface FuelPriceRow {
  id: number;
  source: string;
  fuel_type: string;
  price: number;
  region: string;
  raw_json: string;
  created_at: string;
}

export class PriceHistoryRepository {
  constructor(private readonly client: DatabaseClient) {}

  async saveGoldPrice(data: GoldPriceInput): Promise<void> {
    await this.client.goldPrice.create({
      data: {
        source: data.source,
        buyPrice: data.buyPrice,
        sellPrice: data.sellPrice,
        unit: data.unit,
        rawJson: toJson(data.rawJson),
      },
    });
  }

  async saveFuelPrice(data: FuelPriceInput): Promise<void> {
    await this.client.fuelPrice.create({
      data: {
        source: data.source,
        fuelType: data.fuelType,
        price: data.price,
        region: data.region,
        rawJson: toJson(data.rawJson),
      },
    });
  }

  async getGoldPricesByPeriod(period: ReportPeriod): Promise<GoldPriceRow[]> {
    const rows = await this.client.goldPrice.findMany({
      where: { createdAt: { gte: periodStart(period) } },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      buy_price: row.buyPrice,
      sell_price: row.sellPrice,
      unit: row.unit,
      raw_json: JSON.stringify(row.rawJson),
      created_at: row.createdAt.toISOString(),
    }));
  }

  async getFuelPricesByPeriod(period: ReportPeriod): Promise<FuelPriceRow[]> {
    const rows = await this.client.fuelPrice.findMany({
      where: { createdAt: { gte: periodStart(period) } },
      orderBy: { createdAt: "asc" },
    });

    return rows.map((row) => ({
      id: row.id,
      source: row.source,
      fuel_type: row.fuelType,
      price: row.price,
      region: row.region,
      raw_json: JSON.stringify(row.rawJson),
      created_at: row.createdAt.toISOString(),
    }));
  }
}

function periodStart(period: ReportPeriod): Date {
  const start = new Date();

  if (period === "week") {
    start.setDate(start.getDate() - 7);
    return start;
  }

  if (period === "month") {
    start.setMonth(start.getMonth() - 1);
    return start;
  }

  start.setFullYear(start.getFullYear() - 1);
  return start;
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
