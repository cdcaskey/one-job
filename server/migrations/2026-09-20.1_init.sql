CREATE TABLE tasks (
  id               TEXT PRIMARY KEY,           -- crypto.randomUUID()
  title            TEXT    NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 200),
  notes            TEXT,
  priority         INTEGER NOT NULL CHECK (priority IN (1,2,3)),
  estimate_minutes INTEGER NOT NULL CHECK (estimate_minutes > 0 AND estimate_minutes <= 100000),
  status           TEXT    NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','active','done')),
  created_at       INTEGER NOT NULL,           -- unix epoch ms, UTC
  updated_at       INTEGER NOT NULL,
  completed_at     INTEGER                     -- set iff status='done'
);

CREATE UNIQUE INDEX tasks_one_active ON tasks (status) WHERE status = 'active';
CREATE INDEX tasks_draw ON tasks (status, priority, estimate_minutes);
