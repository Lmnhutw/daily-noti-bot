import "dotenv/config";
import { z } from "zod";

const emptyToUndefined = (value: unknown) => {
  if (typeof value === "string" && value.trim() === "") {
    return undefined;
  }

  return value;
};

const optionalString = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());
const optionalSecret = () => z.preprocess(emptyToUndefined, z.string().min(1).optional());
const defaultedString = (defaultValue: string) =>
  z.preprocess(emptyToUndefined, z.string().min(1).default(defaultValue));
const defaultedNumber = (defaultValue: number) =>
  z.preprocess(emptyToUndefined, z.coerce.number().int().positive().default(defaultValue));
const defaultedUrl = (defaultValue: string) =>
  z.preprocess(emptyToUndefined, z.string().url().default(defaultValue));
const databaseUrl = () =>
  z.preprocess((value) => {
    const normalized = emptyToUndefined(value);

    if (normalized === undefined && process.env.NODE_ENV === "test") {
      return "postgresql://user:password@localhost:5432/daily_noti_bot";
    }

    return normalized;
  }, z.string().min(1, "DATABASE_URL is required").refine((value) => value.startsWith("postgresql://") || value.startsWith("postgres://"), {
    message: "DATABASE_URL must be a PostgreSQL connection string",
  }));

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal", "silent"]).default("info"),
  DATABASE_URL: databaseUrl(),
  TELEGRAM_WEBHOOK_URL: defaultedUrl("https://daily-noti-bot.vercel.app/api/telegram"),
  TELEGRAM_WEBHOOK_SECRET: optionalSecret(),
  TELEGRAM_WEBHOOK_TIMEOUT_MS: defaultedNumber(25000),
  ADMIN_USER_IDS: z.string().default(""),
  DEFAULT_CURRENCY: defaultedString("USD"),
  PRICE_CACHE_TTL_SECONDS: defaultedNumber(120),
  HTTP_TIMEOUT_MS: defaultedNumber(10000),
  MAX_ALERTS_PER_USER: defaultedNumber(20),
  GOLD_API_BASE_URL: defaultedString("https://api.gold-api.com"),
  GOLD_API_KEY: optionalSecret(),
  GOLD_API_KEY_HEADER: defaultedString("x-access-token"),
  GOLD_PROVIDERS_ENABLED: defaultedString("sjc,mihong,doji,pnj,global"),
  GOLD_PROVIDER_FALLBACK_ORDER: defaultedString("mihong,sjc,pnj,doji,global"),
  GOLD_PROVIDER_RETRY_COUNT: defaultedNumber(2),
  GOLD_PROVIDER_HEADERS_JSON: optionalSecret(),
  SJC_GOLD_API_URL: optionalString(),
  SJC_GOLD_SOURCE_URLS: defaultedString(
    "https://giavang.now/api/prices?type=SJL1L10,https://www.vang.today/api/prices?type=SJL1L10",
  ),
  SJC_GOLD_HTML_URL: defaultedString("https://sjc.com.vn/"),
  MIHONG_DOMESTIC_GOLD_API_URL: defaultedString("https://api.mihong.vn/v1/gold-prices?market=domestic"),
  MIHONG_GOLD_HTML_URL: defaultedString("https://www.mihong.vn/"),
  DOJI_GOLD_API_URL: optionalString(),
  DOJI_GOLD_HTML_URL: defaultedString("https://giavang.doji.vn/"),
  PNJ_GOLD_API_URL: optionalString(),
  PNJ_GOLD_SOURCE_URLS: defaultedString(
    "https://giavang.now/api/prices?type=PQHNVM,https://giavang.now/api/prices?type=PQHN24NTT,https://www.vang.today/api/prices?type=PQHNVM,https://www.vang.today/api/prices?type=PQHN24NTT",
  ),
  PNJ_GOLD_HTML_URL: defaultedString("https://www.pnj.com.vn/blog/gia-vang/"),
  GLOBAL_GOLD_API_URL: defaultedString("https://api.mihong.vn/v1/gold-prices?market=global"),
  GLOBAL_GOLD_HTML_URL: defaultedString("https://www.mihong.vn/"),
  FUEL_PRICE_API_URL_TEMPLATE: defaultedString("https://giaxanghomnay.com/api/pvdate/{{YYYY}}-{{MM}}-{{DD}}"),
  FUEL_PRICE_TIMEZONE: defaultedString("Asia/Ho_Chi_Minh"),
  EIA_API_BASE_URL: defaultedString("https://api.eia.gov"),
  EIA_API_KEY: optionalSecret(),
  DAILY_UPDATE_TIMEZONE: defaultedString("Asia/Ho_Chi_Minh"),
  DAILY_UPDATE_CRON: defaultedString("0 7 * * *"),
  ALERT_CHECK_CRON: defaultedString("*/15 * * * *"),
  DISCORD_WEBHOOK_URL: optionalSecret(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const adminUserIds = new Set(
  env.ADMIN_USER_IDS.split(",")
    .map((id) => Number(id.trim()))
    .filter(Number.isFinite),
);
