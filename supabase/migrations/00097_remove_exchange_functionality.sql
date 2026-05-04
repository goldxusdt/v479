-- Remove exchange related functions
DROP FUNCTION IF EXISTS process_exchange_approval(uuid, text);

-- Remove exchange related tables (and their policies)
DROP TABLE IF EXISTS exchange_transactions CASCADE;
DROP TABLE IF EXISTS exchange_settings CASCADE;
DROP TABLE IF EXISTS rate_sync_logs CASCADE;
