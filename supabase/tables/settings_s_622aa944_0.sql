CREATE TABLE public.settings_s_622aa944_0 (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(128),
    emp_id VARCHAR(128),
    category VARCHAR(50) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}',
    is_deleted CHAR(1) DEFAULT 'n',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create unique constraint for corp_id + category
CREATE UNIQUE INDEX idx_settings_corp_category ON public.settings_s_622aa944_0(corp_id, category) WHERE is_deleted = 'n';
