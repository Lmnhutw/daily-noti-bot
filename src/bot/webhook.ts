import { webhookCallback } from "grammy";
import type { Update } from "grammy/types";
import { env } from "../config/env.js";
import type { BotContext } from "../types/context.js";
import { createBotApp } from "./create.js";

type WebhookHandler = (request: Request) => Promise<Response>;
type NodeWebhookRequest = {
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};
type NodeWebhookResponse = {
  end: (callback?: () => void) => NodeWebhookResponse;
  status: (code: number) => NodeWebhookResponse;
  json: (json: string) => unknown;
  send: (body: string) => unknown;
};
type NodeWebhookHandler = (request: NodeWebhookRequest, response: NodeWebhookResponse) => Promise<void>;

let handlerPromise: Promise<WebhookHandler> | undefined;
let nodeHandlerPromise: Promise<NodeWebhookHandler> | undefined;

export function getTelegramWebhookHandler(): Promise<WebhookHandler> {
  handlerPromise ??= createHandler();
  return handlerPromise;
}

export function getTelegramNodeWebhookHandler(): Promise<NodeWebhookHandler> {
  nodeHandlerPromise ??= createNodeHandler();
  return nodeHandlerPromise;
}

async function createHandler(): Promise<WebhookHandler> {
  const { bot } = await createBotApp({ syncCommandMenu: false });

  return webhookCallback<BotContext, "std/http">(bot, "std/http", {
    onTimeout: "return",
    timeoutMilliseconds: env.TELEGRAM_WEBHOOK_TIMEOUT_MS,
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
  });
}

async function createNodeHandler(): Promise<NodeWebhookHandler> {
  const { bot } = await createBotApp({ syncCommandMenu: false });

  const nextHandler = webhookCallback<BotContext, "next-js">(bot, "next-js", {
    onTimeout: "return",
    timeoutMilliseconds: env.TELEGRAM_WEBHOOK_TIMEOUT_MS,
    secretToken: env.TELEGRAM_WEBHOOK_SECRET,
  });

  return (request, response) =>
    nextHandler(request as NodeWebhookRequest & { body: Update }, response);
}
