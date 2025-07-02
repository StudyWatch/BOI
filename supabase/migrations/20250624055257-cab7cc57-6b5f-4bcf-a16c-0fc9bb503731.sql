
-- Fix the schedule_rules table to support multiple rules with same rule_name
-- Remove the unique constraint that's causing the duplicate key error
ALTER TABLE schedule_rules DROP CONSTRAINT IF EXISTS schedule_rules_rule_name_key;

-- Add a composite unique constraint instead to allow multiple shift requirements
-- but prevent exact duplicates of the same shift_type + day_type combination
CREATE UNIQUE INDEX IF NOT EXISTS schedule_rules_shift_requirements_unique 
ON schedule_rules (rule_name, ((rule_value->>'shift_type')), ((rule_value->>'day_type'))) 
WHERE rule_name = 'shift_requirements' AND active = true;

-- Add indexes for better performance on common queries
CREATE INDEX IF NOT EXISTS schedule_rules_rule_name_active_idx 
ON schedule_rules (rule_name, active) 
WHERE active = true;

-- Ensure the rule_value column can handle the new alternative_options structure
-- (This is already JSONB so should work, but let's make sure)
ALTER TABLE schedule_rules ALTER COLUMN rule_value SET DEFAULT '{}';
