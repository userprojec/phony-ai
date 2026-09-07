-- Add twilio_call_sid column to calls table
ALTER TABLE calls_s_622aa944_0 ADD COLUMN IF NOT EXISTS twilio_call_sid VARCHAR(100);

-- Add recording_sid column for Twilio recording tracking
ALTER TABLE calls_s_622aa944_0 ADD COLUMN IF NOT EXISTS recording_sid VARCHAR(100);

-- Add recording_duration column
ALTER TABLE calls_s_622aa944_0 ADD COLUMN IF NOT EXISTS recording_duration INTEGER;

-- Add customer_response column to store DTMF input
ALTER TABLE calls_s_622aa944_0 ADD COLUMN IF NOT EXISTS customer_response VARCHAR(50);

-- Add webhook_base_url to settings table
ALTER TABLE settings_s_622aa944_0 ADD COLUMN IF NOT EXISTS webhook_base_url VARCHAR(500);
