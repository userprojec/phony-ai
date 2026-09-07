-- Add emp_id column to campaign_customers table
ALTER TABLE campaign_customers_s_622aa944_0 ADD COLUMN IF NOT EXISTS emp_id VARCHAR(128);

-- Update existing records to have a default emp_id (optional, for data consistency)
-- UPDATE campaign_customers_s_622aa944_0 SET emp_id = 'system' WHERE emp_id IS NULL;
