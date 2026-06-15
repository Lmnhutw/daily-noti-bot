import cron from "node-cron";
import { Bot } from "grammy";
import { env } from "../config/env.js";
import { createAppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";
import { logger } from "../utils/logger.js";
import { runAlertCheck, runDailyUpdates } from "./jobs.js";

const services = await createAppServices();
const bot = new Bot<BotContext>(env.BOT_TOKEN);

let alertCheckRunning = false;
let dailyUpdateRunning = false;

async function guardedRun(name: string, running: boolean, setRunning: (value: boolean) => void, job: () => Promise<unknown>) {
  if (running) {
    logger.warn({ name }, "Skipped overlapping scheduled job");
    return;
  }

  setRunning(true);

  try {
    const result = await job();
    logger.info({ name, result }, "Scheduled job completed");
  } catch (error) {
    logger.error({ name, error }, "Scheduled job failed");
  } finally {
    setRunning(false);
  }
}

const alertTask = cron.schedule(
  env.ALERT_CHECK_CRON,
  () =>
    void guardedRun(
      "alert-check",
      alertCheckRunning,
      (value) => {
        alertCheckRunning = value;
      },
      () => runAlertCheck(services, bot),
    ),
  {
    timezone: env.DAILY_UPDATE_TIMEZONE,
  },
);

const dailyTask = cron.schedule(
  env.DAILY_UPDATE_CRON,
  () =>
    void guardedRun(
      "daily-update",
      dailyUpdateRunning,
      (value) => {
        dailyUpdateRunning = value;
      },
      () => runDailyUpdates(services, bot),
    ),
  {
    timezone: env.DAILY_UPDATE_TIMEZONE,
  },
);

logger.info(
  {
    alertCron: env.ALERT_CHECK_CRON,
    dailyCron: env.DAILY_UPDATE_CRON,
    timeZone: env.DAILY_UPDATE_TIMEZONE,
  },
  "Local cron worker started",
);

async function shutdown(signal: NodeJS.Signals): Promise<void> {
  logger.info({ signal }, "Stopping local cron worker");
  alertTask.stop();
  dailyTask.stop();
  await services.shutdown();
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
