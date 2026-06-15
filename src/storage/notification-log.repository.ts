import type { DatabaseClient } from "./database.js";

export class NotificationLogRepository {
  constructor(private readonly client: DatabaseClient) {}

  async claim(key: string, type: string, metadata?: unknown): Promise<boolean> {
    try {
      await this.client.notificationLog.create({
        data: {
          key,
          type,
          metadata: metadata === undefined ? undefined : JSON.parse(JSON.stringify(metadata)),
        },
      });

      return true;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return false;
      }

      throw error;
    }
  }

  async release(key: string): Promise<void> {
    await this.client.notificationLog.deleteMany({
      where: { key },
    });
  }
}

function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}
