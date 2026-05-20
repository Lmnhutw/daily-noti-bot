import { createDatabaseClient, migrateDatabase } from "./database.js";
import { logger } from "../utils/logger.js";

const client = createDatabaseClient();

try {
  await migrateDatabase(client);
  logger.info("Database schema is ready");
} finally {
  client.close();
}
