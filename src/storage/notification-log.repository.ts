import type { Client } from "@libsql/client";

export class NotificationLogRepository {
  constructor(private readonly client: Client) {}

  async claim(key: string, type: string, metadata?: unknown): Promise<boolean> {
    const result = await this.client.execute({
      sql: `INSERT OR IGNORE INTO notification_log (key, type, metadata, created_at)
        VALUES (?, ?, ?, ?)`,
      args: [key, type, metadata ? JSON.stringify(metadata) : null, new Date().toISOString()],
    });

    return result.rowsAffected > 0;
  }

  async release(key: string): Promise<void> {
    await this.client.execute({
      sql: "DELETE FROM notification_log WHERE key = ?",
      args: [key],
    });
  }
}
