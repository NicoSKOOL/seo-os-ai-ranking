-- Chat with Hermes (Phase C). One conversation thread per scope (a client, or the
-- orchestrator for "All Clients"). Operator turns are written by the Worker as
-- 'pending' and ride a chat_reply command down to the VPS; Hermes's reply comes
-- back through /agent/commands/:id/complete and is stored as an 'assistant' row.
-- Dashboard-only table: never synced up from the VPS.
CREATE TABLE IF NOT EXISTS chat_messages (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id),
  client_id   TEXT,                              -- null = orchestrator / All Clients scope
  session_key TEXT NOT NULL,                     -- 'dashboard-chat-<client_id>' | 'dashboard-chat-orchestrator'
  role        TEXT NOT NULL,                     -- 'operator' | 'assistant'
  body        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'complete',  -- operator: 'pending'|'answered'|'failed'; assistant: 'complete'
  command_id  TEXT,                              -- the commands row that carried this turn
  error       TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_chat_scope ON chat_messages(account_id, client_id, created_at);
