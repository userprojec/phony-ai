CREATE TABLE public.voice_agents_s_622aa944_0 (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(128),
    emp_id VARCHAR(128),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    voice_type VARCHAR(50),
    voice_accent VARCHAR(50),
    language VARCHAR(50) DEFAULT 'en',
    greeting_script TEXT,
    main_script TEXT,
    faq_responses JSONB DEFAULT '{}',
    company_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_deleted CHAR(1) DEFAULT 'n',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.customers_s_622aa944_0 (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(128),
    emp_id VARCHAR(128),
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50) NOT NULL,
    order_id VARCHAR(100) NOT NULL,
    order_status VARCHAR(100) NOT NULL,
    delivery_date DATE,
    courier_name VARCHAR(100),
    tracking_number VARCHAR(100),
    language VARCHAR(50) DEFAULT 'en',
    city VARCHAR(100),
    amount DECIMAL(10,2),
    notes TEXT,
    validation_status VARCHAR(50) DEFAULT 'pending',
    validation_errors JSONB DEFAULT '[]',
    is_deleted CHAR(1) DEFAULT 'n',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.campaigns_s_622aa944_0 (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(128),
    emp_id VARCHAR(128),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    voice_agent_id INTEGER,
    language VARCHAR(50) DEFAULT 'en',
    time_window_start TIME,
    time_window_end TIME,
    max_retry_attempts INTEGER DEFAULT 3,
    calls_per_minute INTEGER DEFAULT 60,
    caller_id VARCHAR(50),
    scheduled_at TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    is_deleted CHAR(1) DEFAULT 'n',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.campaign_customers_s_622aa944_0 (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(128),
    campaign_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    call_status VARCHAR(50) DEFAULT 'pending',
    call_id INTEGER,
    is_deleted CHAR(1) DEFAULT 'n',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.calls_s_622aa944_0 (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(128),
    emp_id VARCHAR(128),
    campaign_id INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    phone VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    outcome VARCHAR(100),
    started_at TIMESTAMP,
    ended_at TIMESTAMP,
    duration INTEGER,
    transcript TEXT,
    ai_summary TEXT,
    customer_sentiment VARCHAR(50),
    follow_up_required BOOLEAN DEFAULT false,
    retry_count INTEGER DEFAULT 0,
    recording_url VARCHAR(500),
    is_deleted CHAR(1) DEFAULT 'n',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.call_recordings_s_622aa944_0 (
    id SERIAL PRIMARY KEY,
    corp_id VARCHAR(128),
    call_id INTEGER NOT NULL,
    file_name VARCHAR(255),
    file_url VARCHAR(500),
    file_size INTEGER,
    duration INTEGER,
    format VARCHAR(20),
    is_deleted CHAR(1) DEFAULT 'n',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
