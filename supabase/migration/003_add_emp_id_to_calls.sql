-- Add emp_id column to calls table
ALTER TABLE public.calls_s_622aa944_0
ADD COLUMN IF NOT EXISTS emp_id VARCHAR(128);