export const createApiDataTablesSql = `
  CREATE TABLE IF NOT EXISTS gold_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    buy_price REAL NOT NULL,
    sell_price REAL NOT NULL,
    unit TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS gold_prices_created_at_idx
    ON gold_prices (created_at);

  CREATE TABLE IF NOT EXISTS fuel_prices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    fuel_type TEXT NOT NULL,
    price REAL NOT NULL,
    region TEXT NOT NULL,
    raw_json TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS fuel_prices_created_at_idx
    ON fuel_prices (created_at);

  CREATE INDEX IF NOT EXISTS fuel_prices_type_created_at_idx
    ON fuel_prices (fuel_type, created_at);
`;
