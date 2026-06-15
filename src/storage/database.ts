import { PrismaClient } from "@prisma/client";

export type DatabaseClient = PrismaClient;

export function createDatabaseClient(): DatabaseClient {
  return new PrismaClient();
}
