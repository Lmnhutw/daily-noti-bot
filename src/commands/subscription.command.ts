import type { Bot } from "grammy";
import type { AppServices } from "../services/index.js";
import { normalizeSubscriptionTopic } from "../services/instrument-registry.js";
import type { BotContext } from "../types/context.js";
import { commandArgs, ensureKnownUser, replyWithUnexpectedError } from "./helpers.js";

const subscriptionUsage = [
  "Usage:",
  "/subscribe gold|metals|fuel|oil|all",
  "/unsubscribe gold|metals|fuel|oil|all",
].join("\n");

export function registerSubscriptionCommands(bot: Bot<BotContext>, services: AppServices): void {
  bot.command("subscribe", async (ctx) => {
    try {
      const user = await ensureKnownUser(ctx, services.userService);

      if (!user) {
        return;
      }

      const args = commandArgs(ctx);
      const topic = normalizeSubscriptionTopic(args[0]);

      if (!topic || args[0]?.toLowerCase() === "list") {
        await replyWithSubscriptions(ctx, services, user.telegramId, user.chatId, subscriptionUsage);
        return;
      }

      await services.subscriptionService.subscribe({
        telegramId: user.telegramId,
        chatId: user.chatId,
        topic,
      });

      await ctx.reply(`Subscribed this chat to ${topic} daily updates.`);
    } catch (error) {
      await replyWithUnexpectedError(ctx, error);
    }
  });

  bot.command("unsubscribe", async (ctx) => {
    try {
      const user = await ensureKnownUser(ctx, services.userService);

      if (!user) {
        return;
      }

      const args = commandArgs(ctx);
      const topic = normalizeSubscriptionTopic(args[0]);

      if (!topic) {
        await replyWithSubscriptions(ctx, services, user.telegramId, user.chatId, subscriptionUsage);
        return;
      }

      const removed =
        topic === "all"
          ? await services.subscriptionService.unsubscribeAll(user.telegramId, user.chatId)
          : await services.subscriptionService.unsubscribe({
              telegramId: user.telegramId,
              chatId: user.chatId,
              topic,
            });

      await ctx.reply(
        removed > 0 ? `Removed ${removed} subscription${removed === 1 ? "" : "s"}.` : "No matching subscriptions found.",
      );
    } catch (error) {
      await replyWithUnexpectedError(ctx, error);
    }
  });
}

async function replyWithSubscriptions(
  ctx: BotContext,
  services: AppServices,
  telegramId: number,
  chatId: number,
  prefix: string,
): Promise<void> {
  const subscriptions = await services.subscriptionService.listForChat(telegramId, chatId);
  const current =
    subscriptions.length > 0
      ? `Current subscriptions: ${subscriptions.map((subscription) => subscription.topic).join(", ")}`
      : "Current subscriptions: none";

  await ctx.reply([prefix, "", current].join("\n"));
}
