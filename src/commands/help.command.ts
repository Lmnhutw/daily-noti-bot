import type { Bot } from "grammy";
import type { BotContext } from "../types/context.js";
import { code, htmlMessageOptions } from "../utils/telegram-format.js";

export const helpMessage = [
  "<b>📘 Commands</b>",
  "",
  `${code("/gold")} - Latest gold prices`,
  `${code("/fuel")} - Latest fuel prices`,
  `${code("/subscribe")} - Choose daily update topics`,
  `${code("/unsubscribe gold|fuel|exchange_rates|crypto|stocks|all")} - Remove subscriptions`,
  `${code("/alert gold above 2300")} - Create a one-time alert`,
  `${code("/alert list")} - View active alerts`,
  `${code("/alert remove 12")} - Remove an alert`,
].join("\n");

export function registerHelpCommand(bot: Bot<BotContext>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(helpMessage, htmlMessageOptions);
  });
}
