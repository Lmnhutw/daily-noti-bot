import { run } from "@grammyjs/runner";
import { logger } from "../utils/logger.js";
import { createBotApp } from "./create.js";

const app = await createBotApp();

const runner = run(app.bot);
logger.info("Telegram bot started in long-polling mode");

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, "Stopping Telegram bot");
  await runner.stop();
  await app.shutdown();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

process.on("unhandledRejection", (error) => {
  logger.error({ error }, "Unhandled promise rejection");
});

process.on("uncaughtException", (error) => {
  logger.fatal({ error }, "Uncaught exception");
  void app.shutdown();
  process.exit(1);
});
