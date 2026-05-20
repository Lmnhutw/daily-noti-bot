import { Bot } from "grammy";
import { env } from "../config/env.js";
import { createAppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";
import { logger } from "../utils/logger.js";
import { runAlertCheck } from "./jobs.js";

const services = await createAppServices();
const bot = new Bot<BotContext>(env.BOT_TOKEN);

try {
  const result = await runAlertCheck(services, bot);
  logger.info(result, "Alert check completed");
} catch (error) {
  logger.error({ error }, "Alert check failed");
  process.exitCode = 1;
} finally {
  services.shutdown();
}
