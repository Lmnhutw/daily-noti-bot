CREATE TABLE "users" (
  "telegram_id" BIGINT NOT NULL,
  "chat_id" BIGINT NOT NULL,
  "username" TEXT,
  "first_name" TEXT,
  "last_name" TEXT,
  "language_code" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "users_pkey" PRIMARY KEY ("telegram_id")
);

CREATE TABLE "subscriptions" (
  "id" SERIAL NOT NULL,
  "telegram_id" BIGINT NOT NULL,
  "chat_id" BIGINT NOT NULL,
  "topic" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "alerts" (
  "id" SERIAL NOT NULL,
  "telegram_id" BIGINT NOT NULL,
  "chat_id" BIGINT NOT NULL,
  "symbol" TEXT NOT NULL,
  "direction" TEXT NOT NULL,
  "threshold" DOUBLE PRECISION NOT NULL,
  "currency" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "last_price" DOUBLE PRECISION,
  "triggered_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "alerts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "notification_log" (
  "key" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "notification_log_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "gold_prices" (
  "id" SERIAL NOT NULL,
  "source" TEXT NOT NULL,
  "buy_price" DOUBLE PRECISION NOT NULL,
  "sell_price" DOUBLE PRECISION NOT NULL,
  "unit" TEXT NOT NULL,
  "raw_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "gold_prices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "fuel_prices" (
  "id" SERIAL NOT NULL,
  "source" TEXT NOT NULL,
  "fuel_type" TEXT NOT NULL,
  "price" DOUBLE PRECISION NOT NULL,
  "region" TEXT NOT NULL,
  "raw_json" JSONB NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "fuel_prices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "subscriptions_telegram_id_chat_id_topic_key"
  ON "subscriptions"("telegram_id", "chat_id", "topic");

CREATE INDEX "subscriptions_chat_topic_idx"
  ON "subscriptions"("chat_id", "topic");

CREATE INDEX "alerts_active_symbol_idx"
  ON "alerts"("active", "symbol");

CREATE INDEX "alerts_user_chat_idx"
  ON "alerts"("telegram_id", "chat_id");

CREATE INDEX "notification_log_type_idx"
  ON "notification_log"("type", "created_at");

CREATE INDEX "gold_prices_created_at_idx"
  ON "gold_prices"("created_at");

CREATE INDEX "fuel_prices_created_at_idx"
  ON "fuel_prices"("created_at");

CREATE INDEX "fuel_prices_type_created_at_idx"
  ON "fuel_prices"("fuel_type", "created_at");

ALTER TABLE "subscriptions"
  ADD CONSTRAINT "subscriptions_telegram_id_fkey"
  FOREIGN KEY ("telegram_id") REFERENCES "users"("telegram_id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "alerts"
  ADD CONSTRAINT "alerts_telegram_id_fkey"
  FOREIGN KEY ("telegram_id") REFERENCES "users"("telegram_id")
  ON DELETE CASCADE ON UPDATE CASCADE;
