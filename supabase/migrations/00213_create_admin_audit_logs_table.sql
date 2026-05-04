CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_id uuid REFERENCES auth.users(id),
    action text NOT NULL,
    target_table text,
    target_id text,
    old_value jsonb,
    new_value jsonb,
    created_at timestamptz DEFAULT now()
);

-- RLS for admin_audit_logs
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: We assume is_admin function is already created in the previous step
CREATE POLICY "Admins can view all audit logs" ON public.admin_audit_logs
FOR SELECT TO authenticated
USING (public.is_admin(auth.uid()));
