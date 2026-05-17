-- ===========================================
-- Travel WhatsApp Bot - Database Schema
-- Initialisation Script
-- ===========================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===========================================
-- Table: sessions
-- Conversation session state with 24h expiry
-- ===========================================
CREATE TABLE IF NOT EXISTS sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id VARCHAR(20) NOT NULL,
    current_flow VARCHAR(20) DEFAULT 'unknown',
    slots JSONB DEFAULT '{}',
    context JSONB DEFAULT '[]',
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    CONSTRAINT sessions_user_id_length CHECK (LENGTH(user_id) >= 10)
);

-- Indexes for sessions
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_updated_at ON sessions(updated_at);

-- ===========================================
-- Table: conversations
-- Individual message logs with intent tracking
-- ===========================================
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
    user_message TEXT NOT NULL,
    bot_response TEXT,
    intent VARCHAR(30) DEFAULT 'unknown',
    action VARCHAR(30) DEFAULT 'greeting',
    response_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for conversations
CREATE INDEX IF NOT EXISTS idx_conversations_session_id ON conversations(session_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_intent ON conversations(intent);

-- ===========================================
-- Table: kpis
-- Daily aggregated metrics for reporting
-- ===========================================
CREATE TABLE IF NOT EXISTS kpis (
    date DATE PRIMARY KEY,
    total_queries INTEGER DEFAULT 0,
    deflected_queries INTEGER DEFAULT 0,
    escalated_queries INTEGER DEFAULT 0,
    avg_response_time_ms INTEGER DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- Table: agency_config
-- Agency-specific settings and branding
-- ===========================================
CREATE TABLE IF NOT EXISTS agency_config (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agency_name VARCHAR(100) NOT NULL,
    fallback_number VARCHAR(20) NOT NULL,
    business_hours_start TIME DEFAULT '09:00',
    business_hours_end TIME DEFAULT '18:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Dubai',
    mock_data_path VARCHAR(200) DEFAULT '/data',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===========================================
-- Functions and Triggers
-- ===========================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for sessions table
DROP TRIGGER IF EXISTS update_sessions_updated_at ON sessions;
CREATE TRIGGER update_sessions_updated_at
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for conversations table
DROP TRIGGER IF EXISTS update_conversations_updated_at ON conversations;
CREATE TRIGGER update_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for kpis table
DROP TRIGGER IF EXISTS update_kpis_updated_at ON kpis;
CREATE TRIGGER update_kpis_updated_at
    BEFORE UPDATE ON kpis
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger for agency_config table
DROP TRIGGER IF EXISTS update_agency_config_updated_at ON agency_config;
CREATE TRIGGER update_agency_config_updated_at
    BEFORE UPDATE ON agency_config
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- Functions for Session Management
-- ===========================================

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get or create session
CREATE OR REPLACE FUNCTION get_or_create_session(
    p_user_id VARCHAR(20),
    p_current_flow VARCHAR(20) DEFAULT 'unknown'
)
RETURNS sessions AS $$
DECLARE
    v_session sessions;
BEGIN
    -- Try to find existing non-expired session
    SELECT * INTO v_session
    FROM sessions
    WHERE user_id = p_user_id
      AND expires_at > NOW()
    ORDER BY updated_at DESC
    LIMIT 1;

    -- Create new session if not found
    IF v_session IS NULL THEN
        INSERT INTO sessions (user_id, current_flow)
        VALUES (p_user_id, p_current_flow)
        RETURNING * INTO v_session;
    END IF;

    RETURN v_session;
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Functions for KPI Management
-- ===========================================

-- Function to update daily KPIs
CREATE OR REPLACE FUNCTION upsert_daily_kpi(
    p_date DATE,
    p_total_queries INTEGER DEFAULT 1,
    p_deflected BOOLEAN DEFAULT TRUE,
    p_escalated BOOLEAN DEFAULT FALSE,
    p_response_time_ms INTEGER DEFAULT 0
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO kpis (date, total_queries, deflected_queries, escalated_queries, avg_response_time_ms)
    VALUES (p_date, p_total_queries, CASE WHEN p_deflected THEN 1 ELSE 0 END, CASE WHEN p_escalated THEN 1 ELSE 0 END, p_response_time_ms)
    ON CONFLICT (date) DO UPDATE SET
        total_queries = kpis.total_queries + p_total_queries,
        deflected_queries = kpis.deflected_queries + CASE WHEN p_deflected THEN 1 ELSE 0 END,
        escalated_queries = kpis.escalated_queries + CASE WHEN p_escalated THEN 1 ELSE 0 END,
        avg_response_time_ms = (
            (kpis.avg_response_time_ms * (kpis.total_queries - p_total_queries)) + p_response_time_ms
        ) / kpis.total_queries,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- Default Agency Configuration
-- ===========================================

INSERT INTO agency_config (agency_name, fallback_number, business_hours_start, business_hours_end, timezone, mock_data_path)
VALUES (
    'Default Travel Agency',
    '+919876543210',
    '09:00',
    '18:00',
    'Asia/Dubai',
    '/data'
) ON CONFLICT DO NOTHING;

-- ===========================================
-- Initial Cleanup
-- ===========================================

-- Clean up any expired sessions on startup
SELECT cleanup_expired_sessions();