create table landing_page_settings (
  id uuid primary key default gen_random_uuid(),
  section_name text unique not null,
  content jsonb not null,
  updated_at timestamptz default now()
);

-- Enable RLS
alter table landing_page_settings enable row level security;

-- Policies
create policy "Allow public read access" on landing_page_settings
  for select using (true);

create policy "Allow admin update access" on landing_page_settings
  for update using (auth.uid() in (select id from profiles where role = 'admin'));

-- Initial data
insert into landing_page_settings (section_name, content) values
('hero', '{"badge": "Live Platform Status: Active", "title": "The Gold Standard of Digital Wealth", "description": "Join the elite circle of investors earning consistent 10% monthly ROI. Secure, transparent, and built for your financial freedom.", "primary_button": "Start Investing", "secondary_button": "Member Login"}'),
('stats', '[{"value": "10K+", "label": "Active Investors"}, {"value": "$5M+", "label": "Total Deposited"}, {"value": "100%", "label": "Payout Record"}, {"value": "24/7", "label": "Live Support"}]'),
('features', '{"title": "Why Choose Us", "subtitle": "Built for Performance", "description": "We combine traditional gold stability with modern blockchain efficiency to deliver unmatched returns and security for our investors.", "items": [{"title": "High Yield ROI", "desc": "Earn a consistent 10% monthly return on your investment, paid out automatically to your wallet."}, {"title": "Bank-Grade Security", "desc": "Your assets are protected by enterprise-level encryption and secure cold storage protocols."}, {"title": "Multi-Level Referral", "desc": "Unlock 4 levels of commission earnings (8%, 4%, 2%, 1%) by building your own network."}, {"title": "Instant Processing", "desc": "Deposits and withdrawals are processed with lightning speed through our automated system."}, {"title": "Real-Time Analytics", "desc": "Track your earnings, team performance, and growth with our advanced dashboard."}, {"title": "Global Access", "desc": "Invest from anywhere in the world using USDT. No borders, no limits, just pure growth."}]}'),
('seo', '{"title": "Gold X Usdt - Premium Crypto Investment Platform", "description": "Experience the future of wealth generation with Gold X Usdt. 10% monthly ROI, secure blockchain infrastructure, and a powerful multi-level referral system.", "keywords": ["gold usdt", "crypto investment", "passive income", "high roi", "secure wallet", "usdt mining", "wealth generation"]}');
