import { Bot } from "grammy";
import { env } from "../config/env.js";
import { createAppServices, type AppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";
import { logger } from "../utils/logger.js";
import { registerCommands } from "./commands.js";
import { registerMiddleware } from "./middleware.js";

export interface BotApp {
  bot: Bot<BotContext>;
  services: AppServices;
  shutdown: () => Promise<void>;
}

export interface CreateBotAppOptions {
  syncCommandMenu?: boolean;
}

export async function createBotApp(options: CreateBotAppOptions = {}): Promise<BotApp> {
  const { syncCommandMenu = true } = options;
  const services = await createAppServices();
  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  registerMiddleware(bot, services.sessions);
  await registerCommands(bot, services, { syncCommandMenu });

  bot.catch((error) => {
    logger.error(
      {
        error: error.error,
        update: error.ctx.update,
      },
      "Bot update failed",
    );
  });

  return {
    bot,
    services,
    shutdown: () => services.shutdown(),
  };
}
