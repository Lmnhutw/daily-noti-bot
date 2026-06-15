import { getTelegramNodeWebhookHandler } from "../src/bot/webhook.js";

type VercelRequest = {
  method?: string;
  body?: unknown;
  headers: Record<string, string | string[] | undefined>;
};

type VercelResponse = {
  end: (callback?: () => void) => VercelResponse;
  setHeader: (name: string, value: string) => void;
  status: (code: number) => VercelResponse;
  json: (body: unknown) => unknown;
  send: (body: string) => unknown;
};

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method === "GET") {
    response.status(200).json({ ok: true, endpoint: "/api/telegram" });
    return;
  }

  if (request.method === "OPTIONS") {
    response.setHeader("Allow", "GET, POST, OPTIONS");
    response.status(204).end();
    return;
  }

  if (request.method !== "POST") {
    response.setHeader("Allow", "GET, POST, OPTIONS");
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  const webhookHandler = await getTelegramNodeWebhookHandler();
  await webhookHandler(request, response);
}
