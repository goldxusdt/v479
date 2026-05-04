CREATE OR REPLACE FUNCTION public.handle_investment_option_deletion()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    UPDATE public.coupons 
    SET applicable_plans = array_remove(applicable_plans, OLD.id)
    WHERE OLD.id = ANY(applicable_plans);
    RETURN OLD;
END;
$$;

DO $$ BEGIN
    CREATE TRIGGER on_investment_option_deleted
    BEFORE DELETE ON public.investment_options
    FOR EACH ROW EXECUTE FUNCTION public.handle_investment_option_deletion();
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
