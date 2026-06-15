import type { Bot } from "grammy";
import { requireAdmin } from "../bot/middleware.js";
import type { AppServices } from "../services/index.js";
import type { BotContext } from "../types/context.js";
import { bold, htmlMessageOptions } from "../utils/telegram-format.js";
import { replyWithUnexpectedError } from "./helpers.js";

export function registerAdminCommand(bot: Bot<BotContext>, services: AppServices): void {
  bot.command("admin", requireAdmin, async (ctx) => {
    try {
      const [users, subscriptions, activeAlerts] = await Promise.all([
        services.users.count(),
        services.subscriptions.count(),
        services.alerts.countActive(),
      ]);

      await ctx.reply(
        [
          `🛠️ ${bold("Bot status")}`,
          "",
          `${bold("Users")}: ${users}`,
          `${bold("Subscriptions")}: ${subscriptions}`,
          `${bold("Active alerts")}: ${activeAlerts}`,
        ].join("\n"),
        htmlMessageOptions,
      );
    } catch (error) {
      await replyWithUnexpectedError(ctx, error);
    }
  });
}
