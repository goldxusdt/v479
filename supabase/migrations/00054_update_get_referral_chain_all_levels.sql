create or replace function public.get_referral_chain(user_id uuid)
returns table (
    referrer_id uuid,
    level integer,
    commission_rate numeric
) as $$
declare
    current_referrer uuid;
    current_level integer := 1;
    v_rate_val text;
    v_rate numeric;
    v_enabled boolean;
begin
    -- Get the first referrer
    select p.referrer_id into current_referrer from public.profiles p where p.id = user_id;
    
    -- Loop through referral chain up to level 15
    while current_referrer is not null and current_level <= 15 loop
        -- Get commission rate for current level from settings table
        select value into v_rate_val 
        from public.settings where key = 'level' || current_level || '_commission' 
        or key = 'referral_level' || current_level || '_commission';
        
        v_rate := (coalesce(v_rate_val, '0')::numeric / 100.0);
        
        -- Dynamic check for all levels 1-15
        case current_level
            when 1 then select referral_level_1_enabled into v_enabled from public.profiles where id = current_referrer;
            when 2 then select referral_level_2_enabled into v_enabled from public.profiles where id = current_referrer;
            when 3 then select referral_level_3_enabled into v_enabled from public.profiles where id = current_referrer;
            when 4 then select referral_level_4_enabled into v_enabled from public.profiles where id = current_referrer;
            when 5 then select referral_level_5_enabled into v_enabled from public.profiles where id = current_referrer;
            when 6 then select referral_level_6_enabled into v_enabled from public.profiles where id = current_referrer;
            when 7 then select referral_level_7_enabled into v_enabled from public.profiles where id = current_referrer;
            when 8 then select referral_level_8_enabled into v_enabled from public.profiles where id = current_referrer;
            when 9 then select referral_level_9_enabled into v_enabled from public.profiles where id = current_referrer;
            when 10 then select referral_level_10_enabled into v_enabled from public.profiles where id = current_referrer;
            when 11 then select referral_level_11_enabled into v_enabled from public.profiles where id = current_referrer;
            when 12 then select referral_level_12_enabled into v_enabled from public.profiles where id = current_referrer;
            when 13 then select referral_level_13_enabled into v_enabled from public.profiles where id = current_referrer;
            when 14 then select referral_level_14_enabled into v_enabled from public.profiles where id = current_referrer;
            when 15 then select referral_level_15_enabled into v_enabled from public.profiles where id = current_referrer;
            else v_enabled := false;
        end case;
        
        if v_enabled and v_rate > 0 then
            referrer_id := current_referrer;
            level := current_level;
            commission_rate := v_rate;
            return next;
        end if;
        
        -- Get next referrer in chain
        select p.referrer_id into current_referrer from public.profiles p where p.id = current_referrer;
        current_level := current_level + 1;
    end loop;
    
    return;
end;
$$ language plpgsql security definer;
