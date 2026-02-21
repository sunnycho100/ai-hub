-- ─────────────────────────────────────────────
-- AI Hub – Memory System Schema (PostgreSQL + pgvector)
-- ─────────────────────────────────────────────

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ─── Users ──────────────────────────────────
-- Lightweight user table for single/multi-user support
CREATE TABLE IF NOT EXISTS memory_users (
  id            TEXT PRIMARY KEY DEFAULT 'default-user',
  display_name  TEXT NOT NULL DEFAULT 'Default User',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed default user
INSERT INTO memory_users (id, display_name)
VALUES ('default-user', 'Default User')
ON CONFLICT (id) DO NOTHING;

-- ─── Sessions ───────────────────────────────
CREATE TABLE IF NOT EXISTS memory_sessions (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES memory_users(id),
  run_id      TEXT NOT NULL,
  started_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at    TIMESTAMPTZ,
  idle_since  TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'idle', 'consolidated', 'closed')),
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sessions_user    ON memory_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_run     ON memory_sessions(run_id);
CREATE INDEX IF NOT EXISTS idx_sessions_status  ON memory_sessions(status);

-- ─── Short-Term Memories ────────────────────
CREATE TABLE IF NOT EXISTS short_term_memories (
  id          TEXT PRIMARY KEY,
  session_id  TEXT NOT NULL REFERENCES memory_sessions(id) ON DELETE CASCADE,
  user_id     TEXT NOT NULL REFERENCES memory_users(id),
  type        TEXT NOT NULL
                CHECK (type IN ('message', 'preference', 'feedback', 'decision', 'topic')),
  content     TEXT NOT NULL,
  source      TEXT NOT NULL
                CHECK (source IN ('user_input', 'ai_response', 'inferred')),
  provider    TEXT,
  round       INTEGER,
  metadata    JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stm_session  ON short_term_memories(session_id);
CREATE INDEX IF NOT EXISTS idx_stm_user     ON short_term_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_stm_type     ON short_term_memories(type);

-- ─── Long-Term Memories ─────────────────────
CREATE TABLE IF NOT EXISTS long_term_memories (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES memory_users(id),
  category        TEXT NOT NULL
                    CHECK (category IN (
                      'writing_style', 'output_satisfaction',
                      'user_profile', 'topic_knowledge', 'session_history'
                    )),
  content         TEXT NOT NULL,
  embedding       vector(1536),          -- OpenAI text-embedding-3-small dimension
  confidence      REAL NOT NULL DEFAULT 0.5
                    CHECK (confidence >= 0 AND confidence <= 1),
  importance      REAL NOT NULL DEFAULT 0.5
                    CHECK (importance >= 0 AND importance <= 1),
  source_sessions TEXT[] NOT NULL DEFAULT '{}',
  valid_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalid_at      TIMESTAMPTZ,           -- NULL = currently valid
  superseded_by   TEXT REFERENCES long_term_memories(id),
  version         INTEGER NOT NULL DEFAULT 1,
  metadata        JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ltm_user      ON long_term_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_ltm_category  ON long_term_memories(category);
CREATE INDEX IF NOT EXISTS idx_ltm_valid     ON long_term_memories(invalid_at)
  WHERE invalid_at IS NULL;  -- partial index for active memories only

-- ─── Topic Edges (Knowledge Graph) ─────────
CREATE TABLE IF NOT EXISTS topic_edges (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES memory_users(id),
  source_topic    TEXT NOT NULL,
  target_topic    TEXT NOT NULL,
  relationship    TEXT NOT NULL,
  strength        REAL NOT NULL DEFAULT 0.5
                    CHECK (strength >= 0 AND strength <= 1),
  valid_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  invalid_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_edges_user    ON topic_edges(user_id);
CREATE INDEX IF NOT EXISTS idx_edges_source  ON topic_edges(source_topic);
CREATE INDEX IF NOT EXISTS idx_edges_target  ON topic_edges(target_topic);

-- ─── Memory Files (.md snapshots) ───────────
CREATE TABLE IF NOT EXISTS memory_files (
  id          TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES memory_users(id),
  category    TEXT NOT NULL
                CHECK (category IN (
                  'writing_style', 'output_satisfaction',
                  'user_profile', 'topic_knowledge', 'session_history'
                )),
  content     TEXT NOT NULL DEFAULT '',
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- Seed default memory files for the default user
INSERT INTO memory_files (id, user_id, category, content)
VALUES
  ('mf-writing-style',      'default-user', 'writing_style',      '# Writing Style Preferences\n\n_No preferences recorded yet._\n'),
  ('mf-output-satisfaction', 'default-user', 'output_satisfaction', '# Output Satisfaction\n\n_No feedback recorded yet._\n'),
  ('mf-user-profile',       'default-user', 'user_profile',        '# User Profile\n\n_No profile data yet._\n'),
  ('mf-topic-knowledge',    'default-user', 'topic_knowledge',     '# Topic Knowledge\n\n_No topics recorded yet._\n'),
  ('mf-session-history',    'default-user', 'session_history',     '# Session History\n\n_No sessions recorded yet._\n')
ON CONFLICT (user_id, category) DO NOTHING;
