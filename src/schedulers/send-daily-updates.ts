import { Bot } from "grammy";
import { env } from "../config/env.js";
import { createAppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";
import { logger } from "../utils/logger.js";
import { runDailyUpdates } from "./jobs.js";

const services = await createAppServices();
const bot = new Bot<BotContext>(env.BOT_TOKEN);

try {
  const result = await runDailyUpdates(services, bot);
  logger.info(result, "Daily updates completed");
} catch (error) {
  logger.error({ error }, "Daily updates failed");
  process.exitCode = 1;
} finally {
  await services.shutdown();
}
