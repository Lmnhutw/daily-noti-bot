import type { Bot } from "grammy";
import type { BotContext } from "../types/context.js";

export const helpMessage = [
  "Available commands:",
  "/gold - Show current gold price",
  "/fuel - Show current gasoline and diesel prices",
  "/subscribe gold|metals|fuel|oil|all - Daily updates for this chat",
  "/unsubscribe gold|metals|fuel|oil|all - Stop daily updates",
  "/alert gold above 2300 - Create a one-shot threshold alert",
  "/alert list - List active alerts",
  "/alert remove 12 - Remove an alert",
].join("\n");

export function registerHelpCommand(bot: Bot<BotContext>): void {
  bot.command("help", async (ctx) => {
    await ctx.reply(helpMessage);
  });
}
