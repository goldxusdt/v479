-- Enable RLS for roi_adjustments
ALTER TABLE public.roi_adjustments ENABLE ROW LEVEL SECURITY;

-- Allow only admins to manage roi_adjustments
CREATE POLICY "Admins can manage roi_adjustments" 
ON public.roi_adjustments 
FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Allow everyone (authenticated) to view roi_adjustments
CREATE POLICY "Everyone can view roi_adjustments" 
ON public.roi_adjustments 
FOR SELECT 
USING (true);
