-- 1. Enhanced Security Event Logging
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_event_type text,
    p_severity text,
    p_description text,
    p_ip_address text DEFAULT NULL,
    p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_event_id uuid;
BEGIN
    INSERT INTO public.security_events (
        user_id,
        event_type,
        severity,
        description,
        ip_address,
        metadata
    )
    VALUES (
        auth.uid(),
        p_event_type,
        p_severity,
        p_description,
        p_ip_address,
        p_metadata || jsonb_build_object(
            'timestamp', now(),
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        )
    )
    RETURNING id INTO v_event_id;
    
    RETURN v_event_id;
END;
$$;

-- 2. Enhanced Rate Limiting with Identifier Support
CREATE OR REPLACE FUNCTION public.check_rate_limit(
    p_identifier text,
    p_endpoint text,
    p_limit integer,
    p_window_seconds integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_count integer;
    v_window interval;
BEGIN
    v_window := (p_window_seconds || ' seconds')::interval;

    -- Cleanup old logs occasionally (1% chance to avoid perf hit)
    IF (random() < 0.01) THEN
        DELETE FROM public.rate_limit_logs WHERE created_at < now() - v_window;
    END IF;

    -- Count requests in window
    SELECT count(*) INTO v_count
    FROM public.rate_limit_logs
    WHERE identifier = p_identifier 
      AND endpoint = p_endpoint 
      AND created_at > now() - v_window;

    IF v_count >= p_limit THEN
        -- Log attempt to security_events
        PERFORM public.log_security_event(
            'rate_limit_exceeded',
            'medium',
            format('Rate limit exceeded for %s on %s', p_identifier, p_endpoint),
            NULL,
            jsonb_build_object('limit', p_limit, 'window', p_window_seconds)
        );
        RETURN false;
    END IF;

    -- Record request
    INSERT INTO public.rate_limit_logs (identifier, endpoint) 
    VALUES (p_identifier, p_endpoint);
    
    RETURN true;
END;
$$;

-- 3. Data Integrity Constraints (Anti-Manipulation)
ALTER TABLE public.wallets ADD CONSTRAINT positive_balance CHECK (balance >= 0);
ALTER TABLE public.transactions ADD CONSTRAINT positive_amount CHECK (amount > 0);
ALTER TABLE public.roi_records ADD CONSTRAINT positive_roi CHECK (roi_amount >= 0);
ALTER TABLE public.exchange_transactions ADD CONSTRAINT positive_exchange_usdt CHECK (amount_usdt > 0);
ALTER TABLE public.exchange_transactions ADD CONSTRAINT positive_exchange_inr CHECK (amount_inr >= 0);

-- 4. Audit Log Trigger Function
CREATE OR REPLACE FUNCTION public.audit_table_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.admin_audit_logs (
            admin_id,
            action,
            entity_type,
            entity_id,
            before_state,
            after_state
        )
        VALUES (
            auth.uid(),
            'UPDATE',
            TG_TABLE_NAME,
            OLD.id::text,
            to_jsonb(OLD),
            to_jsonb(NEW)
        );
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.admin_audit_logs (
            admin_id,
            action,
            entity_type,
            entity_id,
            before_state
        )
        VALUES (
            auth.uid(),
            'DELETE',
            TG_TABLE_NAME,
            OLD.id::text,
            to_jsonb(OLD)
        );
        RETURN OLD;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO public.admin_audit_logs (
            admin_id,
            action,
            entity_type,
            entity_id,
            after_state
        )
        VALUES (
            auth.uid(),
            'INSERT',
            TG_TABLE_NAME,
            NEW.id::text,
            to_jsonb(NEW)
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$;

-- Apply Audit to Critical Tables
DROP TRIGGER IF EXISTS audit_profiles_trigger ON public.profiles;
CREATE TRIGGER audit_profiles_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS audit_wallets_trigger ON public.wallets;
CREATE TRIGGER audit_wallets_trigger
AFTER UPDATE OR DELETE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

DROP TRIGGER IF EXISTS audit_transactions_trigger ON public.transactions;
CREATE TRIGGER audit_transactions_trigger
AFTER UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.audit_table_change();

-- 5. Protection against vertical privilege escalation
CREATE OR REPLACE FUNCTION public.check_can_update_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Only super_admin can change roles
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'super_admin'
        ) THEN
            RAISE EXCEPTION 'Only Super Admins can change user roles';
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS check_role_change_trigger ON public.profiles;
CREATE TRIGGER check_role_change_trigger
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.check_can_update_role();
