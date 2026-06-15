import { Bot } from "grammy";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const bot = new Bot(env.BOT_TOKEN);

await bot.api.setWebhook(env.TELEGRAM_WEBHOOK_URL, {
  allowed_updates: ["message", "callback_query"],
  secret_token: env.TELEGRAM_WEBHOOK_SECRET,
});

logger.info({ url: env.TELEGRAM_WEBHOOK_URL }, "Telegram webhook configured");
