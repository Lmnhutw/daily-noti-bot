import { run } from "@grammyjs/runner";
import { Bot } from "grammy";
import { env } from "../config/env.js";
import { createAppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";
import { logger } from "../utils/logger.js";
import { registerCommands } from "./commands.js";
import { registerMiddleware } from "./middleware.js";

const services = await createAppServices();
const bot = new Bot<BotContext>(env.BOT_TOKEN);

registerMiddleware(bot);
await registerCommands(bot, services);

bot.catch((error) => {
  logger.error(
    {
      error: error.error,
      update: error.ctx.update,
    },
    "Bot update failed",
  );
});

const runner = run(bot);
logger.info("Telegram bot started");

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, "Stopping Telegram bot");
  await runner.stop();
  await services.shutdown();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

process.on("unhandledRejection", (error) => {
  logger.error({ error }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  void services.shutdown();
  process.exit(1);
});
