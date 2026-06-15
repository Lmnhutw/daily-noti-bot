import type { Prisma } from "@prisma/client";
import type { StorageAdapter } from "grammy";
import type { SessionData } from "../types/context.js";
import type { DatabaseClient } from "./database.js";

export class SessionRepository implements StorageAdapter<SessionData> {
  constructor(private readonly client: DatabaseClient) {}

  async read(key: string): Promise<SessionData | undefined> {
    const row = await this.client.botSession.findUnique({
      where: { key },
    });

    return row ? (row.data as SessionData) : undefined;
  }

  async write(key: string, value: SessionData): Promise<void> {
    const data = toJson(value);

    await this.client.botSession.upsert({
      where: { key },
      create: { key, data },
      update: { data },
    });
  }

  async delete(key: string): Promise<void> {
    await this.client.botSession.deleteMany({
      where: { key },
    });
  }
}

function toJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}
