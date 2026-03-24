-- Create query optimization sessions table
CREATE TABLE IF NOT EXISTS query_sessions (
  id SERIAL PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE,
  query_text TEXT NOT NULL,
  database_name TEXT NOT NULL DEFAULT 'postgres',
  user_name TEXT NOT NULL DEFAULT 'postgres',
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  total_duration_ms REAL,
  total_stages INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_query_sessions_session_id ON query_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_query_sessions_status ON query_sessions(status);
CREATE INDEX IF NOT EXISTS idx_query_sessions_start_time ON query_sessions(start_time DESC);

-- Create optimization stages table
CREATE TABLE IF NOT EXISTS optimization_stages (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES query_sessions(id) ON DELETE CASCADE,
  stage_seq INTEGER NOT NULL,
  stage_name TEXT NOT NULL,
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  duration_ms REAL,
  stage_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_optimization_stages_session_id ON optimization_stages(session_id);
CREATE INDEX IF NOT EXISTS idx_optimization_stages_stage_seq ON optimization_stages(session_id, stage_seq);

-- Create execution paths table
CREATE TABLE IF NOT EXISTS execution_paths (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES query_sessions(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL REFERENCES optimization_stages(id) ON DELETE CASCADE,
  path_type TEXT NOT NULL,
  path_description TEXT NOT NULL,
  total_cost REAL NOT NULL,
  startup_cost REAL NOT NULL,
  rows_estimate INTEGER NOT NULL DEFAULT 0,
  is_selected BOOLEAN NOT NULL DEFAULT FALSE,
  parent_rel TEXT,
  path_data JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_execution_paths_session_id ON execution_paths(session_id);
CREATE INDEX IF NOT EXISTS idx_execution_paths_stage_id ON execution_paths(stage_id);

-- Create execution events table (for real-time tracking)
CREATE TABLE IF NOT EXISTS execution_events (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES query_sessions(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_execution_events_session_id ON execution_events(session_id);
CREATE INDEX IF NOT EXISTS idx_execution_events_timestamp ON execution_events(timestamp DESC);
