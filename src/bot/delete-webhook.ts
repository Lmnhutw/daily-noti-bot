import { Bot } from "grammy";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

const bot = new Bot(env.BOT_TOKEN);

await bot.api.deleteWebhook();

logger.info("Telegram webhook deleted");
