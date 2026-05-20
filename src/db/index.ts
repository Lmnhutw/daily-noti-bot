import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { env } from "../config/env.js";
import { createApiDataTablesSql } from "./schema.js";

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

const databasePath = resolve(process.cwd(), env.DATABASE_PATH);
mkdirSync(dirname(databasePath), { recursive: true });

const db = new Database(databasePath);
db.pragma("journal_mode = WAL");
db.exec(createApiDataTablesSql);

const insertGoldPrice = db.prepare(`
  INSERT INTO gold_prices (source, buy_price, sell_price, unit, raw_json)
  VALUES (@source, @buyPrice, @sellPrice, @unit, @rawJson)
`);

const insertFuelPrice = db.prepare(`
  INSERT INTO fuel_prices (source, fuel_type, price, region, raw_json)
  VALUES (@source, @fuelType, @price, @region, @rawJson)
`);

const selectGoldPricesByPeriod = db.prepare(`
  SELECT id, source, buy_price, sell_price, unit, raw_json, created_at
  FROM gold_prices
  WHERE created_at >= datetime('now', ?)
  ORDER BY created_at ASC
`);

const selectFuelPricesByPeriod = db.prepare(`
  SELECT id, source, fuel_type, price, region, raw_json, created_at
  FROM fuel_prices
  WHERE created_at >= datetime('now', ?)
  ORDER BY created_at ASC
`);

export function saveGoldPrice(data: GoldPriceInput): void {
  insertGoldPrice.run({
    source: data.source,
    buyPrice: data.buyPrice,
    sellPrice: data.sellPrice,
    unit: data.unit,
    rawJson: JSON.stringify(data.rawJson),
  });
}

export function saveFuelPrice(data: FuelPriceInput): void {
  insertFuelPrice.run({
    source: data.source,
    fuelType: data.fuelType,
    price: data.price,
    region: data.region,
    rawJson: JSON.stringify(data.rawJson),
  });
}

export function getGoldPricesByPeriod(period: ReportPeriod): GoldPriceRow[] {
  return selectGoldPricesByPeriod.all(periodModifier(period)) as GoldPriceRow[];
}

export function getFuelPricesByPeriod(period: ReportPeriod): FuelPriceRow[] {
  return selectFuelPricesByPeriod.all(periodModifier(period)) as FuelPriceRow[];
}

function periodModifier(period: ReportPeriod): string {
  if (period === "week") {
    return "-7 days";
  }

  if (period === "month") {
    return "-1 month";
  }

  return "-1 year";
}
