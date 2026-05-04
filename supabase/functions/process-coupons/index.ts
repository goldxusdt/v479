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

    // 1. Process Auto-Deactivation/Expiry
    const { data: expiredCoupons, error: expireError } = await supabase
      .from('coupons')
      .update({ 
        is_active: false, 
        is_auto_deleted: true, 
        deletion_reason: 'Expired' 
      })
      .filter('expiry_date', 'lt', new Date().toISOString())
      .filter('is_auto_deleted', 'eq', false)
      .select()

    if (expireError) throw expireError

    // 2. Process Scheduled Activation
    const { data: activatedCoupons, error: activateError } = await supabase
      .from('coupons')
      .update({ is_active: true })
      .filter('campaign_start_at', 'lt', new Date().toISOString())
      .filter('campaign_end_at', 'gt', new Date().toISOString())
      .filter('auto_activate', 'eq', true)
      .filter('is_active', 'eq', false)
      .filter('is_auto_deleted', 'eq', false)
      .select()

    if (activateError) throw activateError

    // 3. Process Scheduled Deactivation
    const { data: deactivatedCoupons, error: deactivateError } = await supabase
      .from('coupons')
      .update({ is_active: false })
      .filter('campaign_end_at', 'lt', new Date().toISOString())
      .filter('auto_deactivate', 'eq', true)
      .filter('is_active', 'eq', true)
      .select()

    if (deactivateError) throw deactivateError

    return new Response(
      JSON.stringify({ 
        success: true, 
        expired: expiredCoupons?.length || 0,
        activated: activatedCoupons?.length || 0,
        deactivated: deactivatedCoupons?.length || 0
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
