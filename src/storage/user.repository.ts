import type { User } from "@prisma/client";
import type { TelegramUser } from "../types/domain.js";
import type { DatabaseClient } from "./database.js";

export interface UpsertTelegramUserInput {
  telegramId: number;
  chatId: number;
  username?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
}

export class UserRepository {
  constructor(private readonly client: DatabaseClient) {}

  async upsert(input: UpsertTelegramUserInput): Promise<TelegramUser> {
    const user = await this.client.user.upsert({
      where: { telegramId: BigInt(input.telegramId) },
      create: {
        telegramId: BigInt(input.telegramId),
        chatId: BigInt(input.chatId),
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        languageCode: input.languageCode ?? null,
      },
      update: {
        chatId: BigInt(input.chatId),
        username: input.username ?? null,
        firstName: input.firstName ?? null,
        lastName: input.lastName ?? null,
        languageCode: input.languageCode ?? null,
      },
    });

    return this.toUser(user);
  }

  async findByTelegramId(telegramId: number): Promise<TelegramUser | undefined> {
    const user = await this.client.user.findUnique({
      where: { telegramId: BigInt(telegramId) },
    });

    return user ? this.toUser(user) : undefined;
  }

  async count(): Promise<number> {
    return this.client.user.count();
  }

  private toUser(row: User): TelegramUser {
    return {
      telegramId: Number(row.telegramId),
      chatId: Number(row.chatId),
      username: row.username ?? undefined,
      firstName: row.firstName ?? undefined,
      lastName: row.lastName ?? undefined,
      languageCode: row.languageCode ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
