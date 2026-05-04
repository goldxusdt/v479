import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Get all enabled auto-gen settings
    const { data: settings, error: settingsError } = await supabase
      .from('coupon_auto_generation_settings')
      .select('*')
      .eq('is_enabled', true)

    if (settingsError) throw settingsError
    if (!settings || settings.length === 0) {
      return new Response(JSON.stringify({ success: true, message: 'No enabled settings found', generatedCount: 0 }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Process each user (for demo/limited scope, we might want to target active users or specific events)
    // Here we'll just check all users' performance
    const { data: users, error: usersError } = await supabase
      .from('profiles')
      .select('id, performance_usdt, manual_level_1_count')

    if (usersError) throw usersError

    let generatedCount = 0

    for (const user of users) {
      for (const setting of settings) {
        const threshold = Number(setting.threshold)
        let userValue = 0

        if (setting.type === 'tier') {
          userValue = Number(user.performance_usdt || 0)
        } else {
          userValue = Number(user.manual_level_1_count || 0)
        }

        if (userValue >= threshold) {
          // Check if user already received a coupon for this setting/threshold
          const safeThreshold = threshold || 0;
          // Use a more unique prefix that includes the full user ID to avoid collisions
          const couponCodePrefix = `${setting.type === 'tier' ? 'T' : 'P'}${safeThreshold}_${user.id.substring(0, 8)}`.toUpperCase();
          
          const { data: existingCoupon } = await supabase
            .from('coupons')
            .select('id')
            .eq('targeted_user_id', user.id)
            .ilike('description', `%${setting.name}%`)
            .maybeSingle()

          if (!existingCoupon) {
            // Generate new coupon for user
            const randomStr = Math.random().toString(36).substring(2, 6);
            const uniqueCode = `${couponCodePrefix}_${randomStr}`.toUpperCase();
            const validityDays = Number(setting.validity_days || 7);
            const expiryDate = new Date();
            expiryDate.setDate(expiryDate.getDate() + validityDays);

            const { error: genError } = await supabase
              .from('coupons')
              .insert({
                code: uniqueCode,
                discount_type: setting.discount_type || 'percentage',
                discount_value: Number(setting.discount_value || 0),
                description: setting.name || 'Auto-generated reward',
                redemption_type: setting.transaction_type || 'all',
                applicable_plans: setting.applicable_plans || [],
                expiry_date: expiryDate.toISOString(),
                single_use_per_user: true,
                usage_limit: 1,
                is_active: true,
                targeted_user_id: user.id
              })

            if (!genError) generatedCount++
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, generatedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
