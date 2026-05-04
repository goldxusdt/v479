alter table public.profiles 
add column if not exists referral_level_1_enabled boolean default true,
add column if not exists referral_level_2_enabled boolean default true,
add column if not exists referral_level_3_enabled boolean default true,
add column if not exists referral_level_4_enabled boolean default true;

-- Update existing profiles to have them enabled by default
update public.profiles 
set referral_level_1_enabled = true,
    referral_level_2_enabled = true,
    referral_level_3_enabled = true,
    referral_level_4_enabled = true
where referral_level_1_enabled is null;
