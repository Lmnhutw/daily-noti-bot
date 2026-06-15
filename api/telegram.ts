import { getTelegramWebhookHandler } from "../src/bot/webhook.js";

export async function GET(): Promise<Response> {
  return Response.json({ ok: true, endpoint: "/api/telegram" });
}

export async function POST(request: Request): Promise<Response> {
  const handler = await getTelegramWebhookHandler();
  return handler(request);
}

export function OPTIONS(): Response {
  return new Response(null, {
    status: 204,
    headers: {
      Allow: "GET, POST, OPTIONS",
    },
  });
}
