import type { Bot } from "grammy";
import type { AppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";
import { ensureKnownUser, replyWithUnexpectedError } from "./helpers.js";
import { helpMessage } from "./help.command.js";

export function registerStartCommand(bot: Bot<BotContext>, services: AppServices): void {
  bot.command("start", async (ctx) => {
    try {
      const user = await ensureKnownUser(ctx, services.userService);

      if (!user) {
        return;
      }

      await ctx.reply(["👋 Price Tracker is ready in this chat.", "", helpMessage].join("\n"));
    } catch (error) {
      await replyWithUnexpectedError(ctx, error);
    }
  });
}
