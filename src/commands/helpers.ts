import type { BotContext } from "../types/context.js";
import { logger } from "../utils/logger.js";
import type { UserService } from "../services/user.service.js";

export interface KnownTelegramUser {
  telegramId: number;
  chatId: number;
}

export function commandArgs(ctx: BotContext): string[] {
  const text = ctx.message?.text ?? "";
  const [, ...args] = text.trim().split(/\s+/);
  return args.filter(Boolean);
}

export async function ensureKnownUser(
  ctx: BotContext,
  userService: UserService,
): Promise<KnownTelegramUser | undefined> {
  if (!ctx.from || !ctx.chat) {
    await ctx.reply("⚠️ This command only works inside a Telegram chat.");
    return undefined;
  }

  await userService.upsertTelegramUser({
    telegramId: ctx.from.id,
    chatId: ctx.chat.id,
    username: ctx.from.username,
    firstName: ctx.from.first_name,
    lastName: ctx.from.last_name,
    languageCode: ctx.from.language_code,
  });

  return {
    telegramId: ctx.from.id,
    chatId: ctx.chat.id,
  };
}

export async function replyWithUnexpectedError(ctx: BotContext, error: unknown): Promise<void> {
  logger.error(
    {
      error,
      updateId: ctx.update.update_id,
      chatId: ctx.chat?.id,
      userId: ctx.from?.id,
    },
    "Command failed",
  );

  await ctx.reply("⚠️ Something went wrong. Please try again in a moment.");
}
