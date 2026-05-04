import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/security.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const now = new Date();
    
    // Call the optimized RPC function to handle all users atomically
    const { data: result, error: rpcError } = await supabase.rpc('credit_daily_roi', {
      p_date: now.toISOString().split('T')[0]
    });

    if (rpcError) {
      console.error('Error in credit_daily_roi RPC:', rpcError);
      throw rpcError;
    }

    const { total_processed, success_count, fail_count } = result[0] || { 
      total_processed: 0, 
      success_count: 0, 
      fail_count: 0 
    };

    // Trigger push notifications for users who received ROI
    if (success_count > 0) {
      const fiveMinsAgo = new Date(Date.now() - 300000).toISOString();
      const { data: recentTxs } = await supabase
        .from('transactions')
        .select('user_id, amount')
        .eq('transaction_type', 'roi_credit')
        .gte('created_at', fiveMinsAgo);

      if (recentTxs && recentTxs.length > 0) {
        // Send push notifications in batches or one by one (batching is better)
        await Promise.all(recentTxs.map(async (tx) => {
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                target_type: 'individual',
                target_id: tx.user_id,
                category: 'roi_arrival',
                title: 'ROI Received 💰',
                body: `You have received ${tx.amount} USDT in ROI credits!`,
                action_url: '/transactions'
              }
            });
          } catch (e) {
            console.error(`Failed to send push to ${tx.user_id}:`, e);
          }
        }));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Daily ROI processing completed`,
        stats: {
          total: total_processed,
          success: success_count,
          failed: fail_count,
          date: now.toISOString().split('T')[0]
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in monthly-interest-credit function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
