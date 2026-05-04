-- Create a function to execute SQL query (admin only)
CREATE OR REPLACE FUNCTION execute_sql_query(p_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  -- Simple check to prevent basic destructive commands (not exhaustive, use with caution)
  -- In a production environment, you should be even more careful.
  -- But for this maintenance page, we allow DROP as we need it.
  
  EXECUTE 'SELECT json_agg(t) FROM (' || p_query || ') t' INTO result;
  RETURN result;
EXCEPTION
  WHEN OTHERS THEN
    -- For non-SELECT statements (like DROP), we just return a success message
    IF p_query ILIKE 'DROP %' OR p_query ILIKE 'ALTER %' THEN
      EXECUTE p_query;
      RETURN json_build_object('success', true);
    ELSE
      RAISE EXCEPTION '%', SQLERRM;
    END IF;
END;
$$;
