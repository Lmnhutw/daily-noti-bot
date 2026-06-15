import { env } from "../config/env.js";
import { PriceHistoryRepository } from "../db/index.js";
import { createGoldProviders } from "../providers/index.js";
import { AlertRepository } from "../storage/alert.repository.js";
import { createDatabaseClient, type DatabaseClient } from "../storage/database.js";
import { NotificationLogRepository } from "../storage/notification-log.repository.js";
import { SessionRepository } from "../storage/session.repository.js";
import { SubscriptionRepository } from "../storage/subscription.repository.js";
import { UserRepository } from "../storage/user.repository.js";
import { AlertService } from "./alert.service.js";
import { DiscordWebhookService } from "./discord-webhook.service.js";
import { GoldService } from "./gold.service.js";
import { EiaProvider } from "./price-providers/eia.provider.js";
import { GiaXangHomNayProvider } from "./price-providers/gia-xang-hom-nay.provider.js";
import { GoldApiProvider } from "./price-providers/gold-api.provider.js";
import { PriceService } from "./price.service.js";
import { SubscriptionService } from "./subscription.service.js";
import { UserService } from "./user.service.js";

export interface AppServices {
  client: DatabaseClient;
  users: UserRepository;
  subscriptions: SubscriptionRepository;
  alerts: AlertRepository;
  notificationLog: NotificationLogRepository;
  sessions: SessionRepository;
  userService: UserService;
  subscriptionService: SubscriptionService;
  alertService: AlertService;
  goldService: GoldService;
  priceService: PriceService;
  discordWebhookService: DiscordWebhookService;
  shutdown: () => Promise<void>;
}

export async function createAppServices(): Promise<AppServices> {
  const client = createDatabaseClient();

  const users = new UserRepository(client);
  const subscriptions = new SubscriptionRepository(client);
  const alerts = new AlertRepository(client);
  const notificationLog = new NotificationLogRepository(client);
  const sessions = new SessionRepository(client);
  const priceHistory = new PriceHistoryRepository(client);
  const goldApiProvider = new GoldApiProvider();
  const eiaProvider = new EiaProvider();
  const giaXangHomNayProvider = new GiaXangHomNayProvider();
  const goldService = new GoldService(
    createGoldProviders(),
    env.PRICE_CACHE_TTL_SECONDS * 1000,
    parseFallbackOrder(env.GOLD_PROVIDER_FALLBACK_ORDER),
    priceHistory,
  );
  const priceService = new PriceService(
    goldApiProvider,
    eiaProvider,
    giaXangHomNayProvider,
    goldService,
    env.PRICE_CACHE_TTL_SECONDS * 1000,
    priceHistory,
  );
  const userService = new UserService(users);
  const subscriptionService = new SubscriptionService(subscriptions);
  const alertService = new AlertService(alerts, priceService);
  const discordWebhookService = new DiscordWebhookService();

  return {
    client,
    users,
    subscriptions,
    alerts,
    notificationLog,
    sessions,
    userService,
    subscriptionService,
    alertService,
    goldService,
    priceService,
    discordWebhookService,
    shutdown: () => client.$disconnect(),
  };
}

function parseFallbackOrder(value: string) {
  return value
    .split(",")
    .map((provider) => provider.trim().toLowerCase())
    .filter(Boolean) as Array<"sjc" | "mihong" | "doji" | "pnj" | "global">;
}
