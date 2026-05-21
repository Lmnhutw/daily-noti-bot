import type { Bot } from "grammy";
import type { BotContext } from "../types/context.js";

export const helpMessage = [
  "📘 Commands",
  "/gold - Latest gold prices",
  "/fuel - Latest fuel prices",
  "/subscribe - Choose daily update topics",
  "/unsubscribe gold|fuel|exchange_rates|crypto|stocks|all - Remove subscriptions",
  "/alert gold above 2300 - Create a one-time alert",
  "/alert list - View active alerts",
  "/alert remove 12 - Remove an alert",
].join("\n");

export function registerHelpCommand(bot: Bot<BotContext>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(helpMessage);
  });
}
