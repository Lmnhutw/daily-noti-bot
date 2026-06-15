import { session, type Bot, type MiddlewareFn, type StorageAdapter } from "grammy";
import { adminUserIds } from "../config/env.js";
import { initialSession, type BotContext, type SessionData } from "../types/context.js";
import { logger } from "../utils/logger.js";

export function registerMiddleware(bot: Bot<BotContext>, storage?: StorageAdapter<SessionData>): void {
  bot.use(
    session({
      initial: initialSession,
      getSessionKey: (ctx) => (ctx.chat && ctx.from ? `${ctx.chat.id}:${ctx.from.id}` : undefined),
      storage,
    }),
  );

  bot.use(async (ctx, next) => {
    const startedAt = Date.now();

    if (ctx.message?.text?.startsWith("/")) {
      ctx.session.lastCommandAt = new Date().toISOString();
    }

    try {
      await next();
    } finally {
      logger.info(
        {
          updateId: ctx.update.update_id,
          chatId: ctx.chat?.id,
          userId: ctx.from?.id,
          durationMs: Date.now() - startedAt,
        },
        "Handled Telegram update",
      );
    }
  });
}

export const requireAdmin: MiddlewareFn<BotContext> = async (ctx, next) => {
  if (!ctx.from || !adminUserIds.has(ctx.from.id)) {
    await ctx.reply("This command is only available to admins.");
    return;
  }

  await next();
};
