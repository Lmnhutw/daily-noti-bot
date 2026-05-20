import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient, type Client } from "@libsql/client";
import { env } from "../config/env.js";
import { schemaStatements } from "./schema.js";

function localDatabasePath(databaseUrl: string): string | undefined {
  if (!databaseUrl.startsWith("file:")) {
    return undefined;
  }

  const rawPath = databaseUrl.slice("file:".length);

  if (!rawPath || rawPath === ":memory:") {
    return undefined;
  }

  if (rawPath.startsWith("//")) {
    return fileURLToPath(databaseUrl);
  }

  return resolve(process.cwd(), rawPath);
}

export function createDatabaseClient(): Client {
  const databasePath = localDatabasePath(env.DATABASE_URL);

  if (databasePath) {
    mkdirSync(dirname(databasePath), { recursive: true });
  }

  return createClient({
    url: env.DATABASE_URL,
    authToken: env.DATABASE_AUTH_TOKEN,
  });
}

export async function migrateDatabase(client: Client): Promise<void> {
  await client.execute("PRAGMA foreign_keys = ON");

  for (const statement of schemaStatements) {
    await client.execute(statement);
  }
}
