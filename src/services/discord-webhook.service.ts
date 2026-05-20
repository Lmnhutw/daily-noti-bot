import axios from "axios";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

export class DiscordWebhookService {
  async send(content: string): Promise<void> {
    if (!env.DISCORD_WEBHOOK_URL) {
      return;
    }

    try {
      await axios.post(
        env.DISCORD_WEBHOOK_URL,
        { content },
        {
          timeout: env.HTTP_TIMEOUT_MS,
        },
      );
    } catch (error) {
      logger.warn({ error }, "Failed to send Discord webhook notification");
    }
  }
}
