import type { Client } from "@libsql/client";
import type { TelegramUser } from "../types/domain.js";
import { optionalString, requiredNumber, requiredString, type DbRow } from "./row.js";

export interface UpsertTelegramUserInput {
  telegramId: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}

export class UserRepository {
  constructor(private readonly client: Client) {}

  async upsert(input: UpsertTelegramUserInput): Promise<TelegramUser> {
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO users (
          telegram_id,
          chat_id,
          username,
          first_name,
          last_name,
          language_code,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT (telegram_id) DO UPDATE SET
          chat_id = excluded.chat_id,
          username = excluded.username,
          first_name = excluded.first_name,
          last_name = excluded.last_name,
          language_code = excluded.language_code,
          updated_at = excluded.updated_at`,
      args: [
        input.telegramId,
        input.chatId,
        input.username ?? null,
        input.firstName ?? null,
        input.lastName ?? null,
        input.languageCode ?? null,
        now,
        now,
      ],
    });

    const user = await this.findByTelegramId(input.telegramId);

    if (!user) {
      throw new Error("User upsert did not return a persisted user");
    }

    return user;
  }

  async findByTelegramId(telegramId: number): Promise<TelegramUser | undefined> {
    const result = await this.client.execute({
      sql: "SELECT * FROM users WHERE telegram_id = ?",
      args: [telegramId],
    });

    const row = result.rows[0] as DbRow | undefined;
    return row ? this.toUser(row) : undefined;
  }

  async count(): Promise<number> {
    const result = await this.client.execute("SELECT COUNT(*) AS total FROM users");
    return requiredNumber(result.rows[0] as DbRow, "total");
  }

  private toUser(row: DbRow): TelegramUser {
    return {
      telegramId: requiredNumber(row, "telegram_id"),
      chatId: requiredNumber(row, "chat_id"),
      username: optionalString(row, "username"),
      firstName: optionalString(row, "first_name"),
      lastName: optionalString(row, "last_name"),
      languageCode: optionalString(row, "language_code"),
      createdAt: requiredString(row, "created_at"),
      updatedAt: requiredString(row, "updated_at"),
    };
  }
}
