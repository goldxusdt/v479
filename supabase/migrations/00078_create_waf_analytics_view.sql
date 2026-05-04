CREATE OR REPLACE VIEW public.waf_analytics AS
SELECT 
    date_trunc('day', created_at)::date as event_date,
    count(*) as event_count
FROM public.security_events
GROUP BY event_date;

-- Grant access to the view
GRANT SELECT ON public.waf_analytics TO authenticated;
GRANT SELECT ON public.waf_analytics TO anon;
GRANT SELECT ON public.waf_analytics TO service_role;
