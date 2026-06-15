import { createDatabaseClient } from "./database.js";

const client = createDatabaseClient();

try {
  const counts = {
    users: await client.user.count(),
    subscriptions: await client.subscription.count(),
    alerts: await client.alert.count(),
    notificationLog: await client.notificationLog.count(),
    botSessions: await client.botSession.count(),
    goldPrices: await client.goldPrice.count(),
    fuelPrices: await client.fuelPrice.count(),
  };

  console.log(JSON.stringify(counts, null, 2));
} finally {
  await client.$disconnect();
}
