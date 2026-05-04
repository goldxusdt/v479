ALTER TABLE public.withdrawals 
ADD COLUMN IF NOT EXISTS coupon_id uuid REFERENCES public.coupons(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS coupon_discount numeric DEFAULT 0;
