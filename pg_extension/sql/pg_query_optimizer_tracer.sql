-- pg_query_optimizer_tracer extension installation script
-- This script creates the extension objects in the target database

-- Create the extension's internal tables for storing trace data
CREATE TABLE IF NOT EXISTS pg_trace_sessions (
    id SERIAL PRIMARY KEY,
    session_id TEXT NOT NULL UNIQUE,
    query_text TEXT NOT NULL,
    query_hash BIGINT,
    start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    total_duration_ms REAL,
    total_stages INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'running',
    pid INTEGER NOT NULL DEFAULT pg_backend_pid(),
    database_name TEXT NOT NULL DEFAULT current_database(),
    user_name TEXT NOT NULL DEFAULT current_user,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pg_trace_sessions_session_id ON pg_trace_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_pg_trace_sessions_pid ON pg_trace_sessions(pid);
CREATE INDEX IF NOT EXISTS idx_pg_trace_sessions_start_time ON pg_trace_sessions(start_time DESC);

-- Create optimization stages table
CREATE TABLE IF NOT EXISTS pg_trace_stages (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES pg_trace_sessions(id) ON DELETE CASCADE,
    stage_seq INTEGER NOT NULL,
    stage_name TEXT NOT NULL,
    stage_data JSONB,
    plan_tree TEXT,
    explain_output TEXT,
    node_type TEXT,
    estimated_cost REAL,
    estimated_rows INTEGER,
    actual_duration_ms REAL NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pg_trace_stages_session_id ON pg_trace_stages(session_id);
CREATE INDEX IF NOT EXISTS idx_pg_trace_stages_stage_seq ON pg_trace_stages(session_id, stage_seq);

-- Create execution paths table
CREATE TABLE IF NOT EXISTS pg_trace_paths (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES pg_trace_sessions(id) ON DELETE CASCADE,
    stage_id INTEGER NOT NULL REFERENCES pg_trace_stages(id) ON DELETE CASCADE,
    path_type TEXT NOT NULL,
    path_description TEXT NOT NULL,
    total_cost REAL NOT NULL,
    startup_cost REAL NOT NULL,
    rows_estimate INTEGER NOT NULL DEFAULT 0,
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    parent_rel TEXT,
    path_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pg_trace_paths_session_id ON pg_trace_paths(session_id);
CREATE INDEX IF NOT EXISTS idx_pg_trace_paths_stage_id ON pg_trace_paths(stage_id);

-- Create execution events table
CREATE TABLE IF NOT EXISTS pg_trace_events (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES pg_trace_sessions(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pg_trace_events_session_id ON pg_trace_events(session_id);
CREATE INDEX IF NOT EXISTS idx_pg_trace_events_timestamp ON pg_trace_events(timestamp DESC);

-- Grant permissions
GRANT SELECT ON ALL TABLES IN SCHEMA public TO PUBLIC;

-- Register extension views
CREATE OR REPLACE VIEW pg_trace_sessions_view AS
SELECT 
    id,
    session_id,
    query_text,
    start_time,
    end_time,
    total_duration_ms,
    total_stages,
    status,
    pid,
    database_name,
    user_name,
    created_at
FROM pg_trace_sessions
ORDER BY start_time DESC;

CREATE OR REPLACE VIEW pg_trace_stage_summary AS
SELECT 
    s.session_id,
    s.query_text,
    s.status,
    s.total_duration_ms,
    st.stage_name,
    COUNT(*) as stage_count,
    SUM(st.actual_duration_ms) as total_stage_duration
FROM pg_trace_sessions s
LEFT JOIN pg_trace_stages st ON s.id = st.session_id
GROUP BY s.session_id, s.query_text, s.status, s.total_duration_ms, st.stage_name;

-- Register extension functions
CREATE OR REPLACE FUNCTION pg_trace_query(sql_text TEXT)
RETURNS TABLE (
    session_id INTEGER,
    stages JSONB[]
) AS $$
DECLARE
    v_session_id INTEGER;
    v_stages JSONB[];
BEGIN
    -- Get latest session for this query
    SELECT id INTO v_session_id 
    FROM pg_trace_sessions 
    WHERE query_text = sql_text 
    ORDER BY start_time DESC 
    LIMIT 1;
    
    IF v_session_id IS NULL THEN
        RETURN;
    END IF;
    
    -- Collect all stages
    SELECT ARRAY_AGG(to_jsonb(st)) INTO v_stages
    FROM pg_trace_stages st
    WHERE st.session_id = v_session_id
    ORDER BY st.stage_seq;
    
    session_id := v_session_id;
    stages := v_stages;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Insert extension metadata
INSERT INTO pg_extension (extname, extowner, extnamespace, extrelocatable, extversion, extconfig, extcondition)
SELECT 'pg_query_optimizer_tracer', 
       (SELECT oid FROM pg_roles WHERE rolname = 'postgres'),
       (SELECT oid FROM pg_namespace WHERE nspname = 'public'),
       false,
       '1.0.0',
       ARRAY['pg_trace_sessions'::regclass, 'pg_trace_stages'::regclass, 'pg_trace_paths'::regclass, 'pg_trace_events'::regclass],
       ARRAY['','','','']
WHERE NOT EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_query_optimizer_tracer'
);
