import type { Bot } from "grammy";
import { registerAdminCommand } from "../commands/admin.command.js";
import { registerAlertCommand } from "../commands/alert.command.js";
import { registerHelpCommand } from "../commands/help.command.js";
import { registerPriceCommands } from "../commands/price.command.js";
import { registerStartCommand } from "../commands/start.command.js";
import { registerSubscriptionCommands } from "../commands/subscription.command.js";
import type { AppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";

const commandMenu = [
  { command: "start", description: "Start the bot" },
  { command: "gold", description: "Current gold price" },
  { command: "fuel", description: "Current fuel prices" },
  { command: "subscribe", description: "Subscribe to daily updates" },
  { command: "unsubscribe", description: "Stop daily updates" },
  { command: "alert", description: "Manage price threshold alerts" },
  { command: "help", description: "Show help" },
];

export interface RegisterCommandsOptions {
  syncCommandMenu?: boolean;
}

export async function registerCommands(
  bot: Bot<BotContext>,
  services: AppServices,
  options: RegisterCommandsOptions = {},
): Promise<void> {
  const { syncCommandMenu = true } = options;

  registerStartCommand(bot, services);
  registerHelpCommand(bot);
  registerPriceCommands(bot, services);
  registerSubscriptionCommands(bot, services);
  registerAlertCommand(bot, services);
  registerAdminCommand(bot, services);

  if (syncCommandMenu) {
    await bot.api.setMyCommands(commandMenu);
  }
}
