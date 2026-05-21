# Daily Notification Bot

Production-ready Telegram bot for gold, fuel, and commodity price updates built with Node.js, TypeScript, and grammY.

## Features

- `/start`, `/gold`, `/fuel`, `/subscribe`, `/unsubscribe`, `/alert`, `/help`
- Real-time precious metal prices through Gold API.
- Fuel and crude oil prices through EIA Open Data.
- SQLite-compatible persistence for users, subscriptions, alerts, and notification idempotency.
- Scheduled daily updates and threshold alert checks.
- GitHub Actions schedule entries plus a local `node-cron` worker.
- Structured logging, validated environment variables, command menu registration, graceful shutdown, and error handling.
- Optional Discord webhook mirroring for scheduled notifications.

## Architecture

```text
src/
  bot/             grammY bot composition, middleware, command menu
  commands/        thin Telegram command handlers
  config/          environment validation
  services/        price providers, subscriptions, alerts, notifications
  schedulers/      GitHub Actions and local cron entrypoints
  storage/         SQLite-compatible repositories and schema setup
  types/           shared domain and bot context types
  utils/           formatting, logging, date helpers
```

Command handlers parse Telegram input and call services. Services own business logic. Repositories own SQL. Scheduled jobs reuse the same services as the bot listener.

## Setup

```bash
npm install
cp .env.example .env
npm run db:init
npm run dev
```

Create a Telegram bot with BotFather and set `BOT_TOKEN` in `.env`.

## Price Data

Gold prices are aggregated through isolated providers under `src/providers`. Initial providers are SJC, Mi Hong, DOJI, PNJ, and Global. Domestic provider prices are normalized to VND per `luong` and displayed as `lượng` plus derived `1 chỉ` values in Telegram. Each provider normalizes its response to:

```ts
{
  provider: string;
  buyPrice: number;
  sellPrice: number;
  updatedAt: string;
  metadata?: object;
}
```

Provider switches:

```dotenv
GOLD_PROVIDERS_ENABLED=sjc,mihong,doji,pnj,global
GOLD_PROVIDER_FALLBACK_ORDER=mihong,sjc,pnj,doji,global
GOLD_PROVIDER_RETRY_COUNT=2
SJC_GOLD_SOURCE_URLS=https://giavang.now/api/prices?type=SJL1L10,https://www.vang.today/api/prices?type=SJL1L10
PNJ_GOLD_SOURCE_URLS=https://giavang.now/api/prices?type=PQHNVM,https://giavang.now/api/prices?type=PQHN24NTT,https://www.vang.today/api/prices?type=PQHNVM,https://www.vang.today/api/prices?type=PQHN24NTT
```

Mi Hong uses `https://api.mihong.vn/v1/gold-prices?market=domestic` by default. Global uses `https://api.mihong.vn/v1/gold-prices?market=global` by default. SJC and PNJ support comma-separated dynamic source URLs, then fall back to HTML scraping URLs. If a provider has no usable buy/sell data, the Telegram message shows `tạm thời không có số liệu` for that provider.

The older Gold API integration remains available for non-gold metals through `https://api.gold-api.com/price/{symbol}` for `XAG`, `XPT`, `XPD`, and `HG`.

The primary fuel provider uses `giaxanghomnay.com` with a date-based URL template:

```dotenv
FUEL_PRICE_API_URL_TEMPLATE=https://giaxanghomnay.com/api/pvdate/{{YYYY}}-{{MM}}-{{DD}}
FUEL_PRICE_TIMEZONE=Asia/Ho_Chi_Minh
```

The bot fills the template with the current date in `FUEL_PRICE_TIMEZONE`, for example `https://giaxanghomnay.com/api/pvdate/2026-04-20`. Gasoline and diesel prices are normalized to VND per `lít`.

If the Vietnamese fuel source fails, the fallback fuel provider uses [EIA Open Data API v2](https://www.eia.gov/opendata/documentation.php) series IDs:

- `PET.EMM_EPMR_PTE_NUS_DPG.W` for U.S. regular gasoline.
- `PET.EMD_EPD2D_PTE_NUS_DPG.W` for U.S. No. 2 diesel.
- `PET.RWTC.D` for WTI crude oil.

EIA requires an API key. Set `EIA_API_KEY` in production.

## Commands

```text
/start
/gold
/fuel
/subscribe gold|metals|fuel|oil|all
/unsubscribe gold|metals|fuel|oil|all
/alert gold above 2300
/alert diesel below 3.50
/alert list
/alert remove 12
```

Alerts are one-shot by default. After an alert fires successfully, it is marked inactive.

## Scheduled Jobs

Local worker:

```bash
npm run worker:cron
```

One-off jobs:

```bash
npm run schedule:daily
npm run schedule:alerts
```

GitHub Actions are configured in `.github/workflows/scheduled-jobs.yml`.

Important: GitHub-hosted runners do not persist local files between runs. For scheduled GitHub jobs, use a shared SQLite-compatible database such as Turso/libSQL:

```dotenv
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=...
```

For a single VPS or worker process, the default `file:./data/bot.db` is fine.

## Deployment

Build and start:

```bash
npm run build
npm start
```

Use long polling on an always-on host. Set a restart policy through your process manager or platform. Store secrets in deployment environment variables, not in `.env` committed to Git.

## Roadmap

- More regional fuel sources and country-specific commodity feeds.
- Multi-step alert creation with grammY conversations.
- Admin broadcast and source health commands.
- AI-generated daily summaries.
- Discord-specific subscription channels.
