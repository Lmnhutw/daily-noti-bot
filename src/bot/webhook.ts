import { webhookCallback } from "grammy";
import { env } from "../config/env.js";
import type { BotContext } from "../types/context.js";
import { createBotApp } from "./create.js";

type WebhookHandler = (request: Request) => Promise<Response>;

let handlerPromise: Promise<WebhookHandler> | undefined;

export function getTelegramWebhookHandler(): Promise<WebhookHandler> {
  handlerPromise ??= createHandler();
  return handlerPromise;
}

async function createHandler(): Promise<WebhookHandler> {
  const { bot } = await createBotApp();

  return webhookCallback<BotContext, "std/http">(bot, "std/http", {
    onTimeout: "return",
    timeoutMilliseconds: env.TELEGRAM_WEBHOOK_TIMEOUT_MS,
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
  });
}
