-- Reviews pulled from a client's Google Business Profile by their agent
-- (postproxy.dev connection, wired in a later milestone). This milestone
-- ships the table + demo seed so the Reviews screen is real.
CREATE TABLE IF NOT EXISTS reviews (
  id            TEXT PRIMARY KEY,
  account_id    TEXT NOT NULL,
  client_id     TEXT NOT NULL,
  source        TEXT NOT NULL DEFAULT 'google',
  reviewer      TEXT NOT NULL,
  rating        INTEGER NOT NULL,
  text          TEXT NOT NULL DEFAULT '',
  themes        TEXT NOT NULL DEFAULT '',
  published_at  TEXT NOT NULL,
  reply_status  TEXT NOT NULL DEFAULT 'needs_reply',
  reply_text    TEXT NOT NULL DEFAULT '',
  replied_at    TEXT,
  approval_id   TEXT,
  created_at    TEXT NOT NULL,
  updated_at    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_reviews_account ON reviews(account_id, client_id);
