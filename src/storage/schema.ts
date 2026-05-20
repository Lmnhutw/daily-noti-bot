export const schemaStatements = [
  `CREATE TABLE IF NOT EXISTS users (
    telegram_id INTEGER PRIMARY KEY,
    chat_id INTEGER NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS subscriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    topic TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (telegram_id, chat_id, topic)
  )`,
  `CREATE INDEX IF NOT EXISTS subscriptions_chat_topic_idx
    ON subscriptions (chat_id, topic)`,
  `CREATE TABLE IF NOT EXISTS alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id INTEGER NOT NULL,
    chat_id INTEGER NOT NULL,
    symbol TEXT NOT NULL,
    direction TEXT NOT NULL,
    threshold REAL NOT NULL,
    currency TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 1,
    last_price REAL,
    triggered_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS alerts_active_symbol_idx
    ON alerts (active, symbol)`,
  `CREATE INDEX IF NOT EXISTS alerts_user_chat_idx
    ON alerts (telegram_id, chat_id)`,
  `CREATE TABLE IF NOT EXISTS notification_log (
    key TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS notification_log_type_idx
    ON notification_log (type, created_at)`,
];
