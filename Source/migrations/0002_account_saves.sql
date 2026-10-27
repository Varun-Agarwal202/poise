CREATE TABLE IF NOT EXISTS account_saves (
  account_id TEXT PRIMARY KEY,
  save_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);
