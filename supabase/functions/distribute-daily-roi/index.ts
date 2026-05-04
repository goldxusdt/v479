import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Starting daily ROI distribution...')

    // 1. Distribute ROI
    const { data: roiData, error: roiError } = await supabase.rpc('distribute_daily_roi')
    if (roiError) throw roiError

    // 2. Process completed investments
    console.log('Checking for completed investments...')
    const { error: lifecycleError } = await supabase.rpc('process_completed_investments')
    if (lifecycleError) console.error('Error processing completed investments:', lifecycleError)

    console.log('ROI distribution and lifecycle management completed')

    return new Response(
      JSON.stringify({ roi: roiData, lifecycle: 'processed' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Error in distribute-daily-roi:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
