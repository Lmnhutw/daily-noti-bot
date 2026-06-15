import type { Bot } from "grammy";
import {
  buildSubscriptionSelectionKeyboard,
  formatSubscriptionSelectionMessage,
  formatSubscriptionTopics,
  parseSubscriptionSelectionCallback,
} from "../../messages/subscription.messages.js";
import type { AppServices } from "../../services/index.js";
import type { BotContext, SubscriptionSelectionSession } from "../../types/context.js";
import type { SubscriptionTopic } from "../../types/domain.js";
import { replyWithUnexpectedError } from "../../commands/helpers.js";
import { logger } from "../../utils/logger.js";
import { bold, htmlMessageOptions } from "../../utils/telegram-format.js";

export function registerSubscriptionCallbacks(bot: Bot<BotContext>, services: AppServices): void {
  bot.callbackQuery(/^sub:/, async (ctx) => {
    try {
      const callback = parseSubscriptionSelectionCallback(ctx.callbackQuery.data);

      if (!callback) {
        await answerInvalidSelection(ctx);
        return;
      }

      const selection = activeSelection(ctx, callback.stateId);

      if (!selection) {
        await answerInvalidSelection(ctx);
        return;
      }

      if (callback.action === "cancel") {
        delete ctx.session.subscriptionSelection;
        await ctx.answerCallbackQuery("Cancelled");
        await ctx.editMessageText(`🟡 ${bold("Subscription update cancelled")}\n\nNo changes were saved.`, htmlMessageOptions);
        return;
      }

      if (callback.action === "confirm") {
        if (selection.selectedTopics.length === 0) {
          await ctx.answerCallbackQuery({
            text: "Select at least one topic or cancel.",
            show_alert: true,
          });
          return;
        }

        const result = await services.subscriptionService.replaceForChat({
          telegramId: selection.telegramId,
          chatId: selection.chatId,
          topics: selection.selectedTopics,
        });

        const selectedTopics = selection.selectedTopics;
        delete ctx.session.subscriptionSelection;

        logger.info(
          {
            telegramId: selection.telegramId,
            chatId: selection.chatId,
            topics: selectedTopics,
            created: result.created,
            removed: result.removed,
            unchanged: result.unchanged,
          },
          "Subscriptions updated from inline keyboard",
        );

        await ctx.answerCallbackQuery("Saved");
        await ctx.editMessageText(
          `✅ ${bold("Daily updates enabled")}: ${formatSubscriptionTopics(selectedTopics)}.`,
          htmlMessageOptions,
        );
        return;
      }

      if (callback.action === "toggle") {
        selection.selectedTopics = toggleTopic(selection.selectedTopics, callback.topic);
        ctx.session.subscriptionSelection = selection;

        await ctx.answerCallbackQuery();
        await ctx.editMessageText(formatSubscriptionSelectionMessage(selection.selectedTopics), {
          ...htmlMessageOptions,
          reply_markup: buildSubscriptionSelectionKeyboard(selection.id, selection.selectedTopics),
        });
      }
    } catch (error) {
      await replyWithUnexpectedError(ctx, error);
    }
  });
}

function activeSelection(ctx: BotContext, stateId: string): SubscriptionSelectionSession | undefined {
  const selection = ctx.session.subscriptionSelection;
  const chatId = ctx.chat?.id ?? ctx.callbackQuery?.message?.chat.id;

  if (
    !selection ||
    selection.id !== stateId ||
    selection.telegramId !== ctx.from?.id ||
    selection.chatId !== chatId ||
    selection.expiresAt <= Date.now()
  ) {
    delete ctx.session.subscriptionSelection;
    return undefined;
  }

  return selection;
}

function toggleTopic(topics: SubscriptionTopic[], topic: SubscriptionTopic): SubscriptionTopic[] {
  if (topics.includes(topic)) {
    return topics.filter((selectedTopic) => selectedTopic !== topic);
  }

  return [...topics, topic];
}

async function answerInvalidSelection(ctx: BotContext): Promise<void> {
  await ctx.answerCallbackQuery({
    text: "This menu expired. Send /subscribe to open a new one.",
    show_alert: true,
  });
}
