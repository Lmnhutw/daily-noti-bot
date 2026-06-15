import { randomUUID } from "node:crypto";
import type { Bot } from "grammy";
import { registerSubscriptionCallbacks } from "../bot/callbacks/subscription.callbacks.js";
import {
  buildSubscriptionSelectionKeyboard,
  formatCurrentSubscriptions,
  formatSubscriptionSelectionMessage,
  formatSubscriptionTopics,
  selectableSubscriptionTopics,
  selectableTopicsFromExisting,
  subscriptionSelectionTtlMs,
} from "../messages/subscription.messages.js";
import type { AppServices } from "../services/index.js";
import { normalizeSubscriptionTopic } from "../services/instrument-registry.js";
import type { BotContext } from "../types/context.js";
import type { SubscriptionTopic } from "../types/domain.js";
import { logger } from "../utils/logger.js";
import { bold, code, htmlMessageOptions } from "../utils/telegram-format.js";
import { commandArgs, ensureKnownUser, replyWithUnexpectedError } from "./helpers.js";

const subscriptionUsage = [
  "🔔 <b>Subscription commands</b>",
  "",
  `${code("/subscribe")} - Open topic picker`,
  `${code("/subscribe gold|fuel|exchange_rates|crypto|stocks")} - Subscribe directly`,
  `${code("/unsubscribe gold|fuel|exchange_rates|crypto|stocks|all")} - Remove subscriptions`,
].join("\n");

export function registerSubscriptionCommands(bot: Bot<BotContext>, services: AppServices): void {
  registerSubscriptionCallbacks(bot, services);

  bot.command("subscribe", async (ctx) => {
    try {
      const user = await ensureKnownUser(ctx, services.userService);

      if (!user) {
        return;
      }

      const args = commandArgs(ctx);

      if (args.length === 0) {
        await replyWithSubscriptionSelection(ctx, services, user.telegramId, user.chatId);
        return;
      }

      if (args[0]?.toLowerCase() === "list") {
        await replyWithSubscriptions(ctx, services, user.telegramId, user.chatId, subscriptionUsage);
        return;
      }

      const topic = normalizeSubscriptionTopic(args[0]);

      if (!topic) {
        await replyWithSubscriptions(ctx, services, user.telegramId, user.chatId, subscriptionUsage);
        return;
      }

      const topics = topicsForLegacySubscribe(topic);

      const created = await services.subscriptionService.subscribeMany({
        telegramId: user.telegramId,
        chatId: user.chatId,
        topics,
      });

      logger.info(
        {
          telegramId: user.telegramId,
          chatId: user.chatId,
          topics,
          created,
        },
        "Subscriptions added from command",
      );

      await ctx.reply(`✅ ${bold("Daily updates enabled")}: ${formatSubscriptionTopics(topics)}.`, htmlMessageOptions);
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

      logger.info(
        {
          telegramId: user.telegramId,
          chatId: user.chatId,
          topic,
          removed,
        },
        "Subscriptions removed from command",
      );

      await ctx.reply(
        removed > 0
          ? topic === "all"
            ? "✅ All subscriptions were removed for this chat."
            : `✅ Removed ${removed} subscription${removed === 1 ? "" : "s"}.`
          : "ℹ️ No matching subscriptions were found for this chat.",
        htmlMessageOptions,
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
  const current = formatCurrentSubscriptions(subscriptions.map((subscription) => subscription.topic));

  await ctx.reply([prefix, "", current].join("\n"), htmlMessageOptions);
}

async function replyWithSubscriptionSelection(
  ctx: BotContext,
  services: AppServices,
  telegramId: number,
  chatId: number,
): Promise<void> {
  const subscriptions = await services.subscriptionService.listForChat(telegramId, chatId);
  const selectedTopics = selectableTopicsFromExisting(subscriptions.map((subscription) => subscription.topic));
  const stateId = randomUUID();

  ctx.session.subscriptionSelection = {
    id: stateId,
    telegramId,
    chatId,
    selectedTopics,
    expiresAt: Date.now() + subscriptionSelectionTtlMs,
  };

  await ctx.reply(formatSubscriptionSelectionMessage(selectedTopics), {
    ...htmlMessageOptions,
    reply_markup: buildSubscriptionSelectionKeyboard(stateId, selectedTopics),
  });
}

function topicsForLegacySubscribe(topic: SubscriptionTopic): SubscriptionTopic[] {
  if (topic === "all") {
    return [...selectableSubscriptionTopics];
  }

  return [topic];
}
