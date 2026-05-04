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
    const currentDay = now.getDate();

    // Only run on the 20th of the month
    if (currentDay !== 20) {
      return new Response(
        JSON.stringify({ message: 'Not today (scheduled for 20th)' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call the optimized RPC function to handle all auto-withdrawals atomically
    const { data: result, error: rpcError } = await supabase.rpc('run_auto_withdrawals');

    if (rpcError) {
      console.error('Error in run_auto_withdrawals RPC:', rpcError);
      throw rpcError;
    }

    const { total_users, success_count, fail_count } = result[0] || {
      total_users: 0,
      success_count: 0,
      fail_count: 0
    };

    // Trigger notifications for auto-withdrawals
    if (success_count > 0) {
      const { data: recentWithdrawals } = await supabase
        .from('withdrawals')
        .select('user_id, amount')
        .eq('status', 'pending')
        .gte('created_at', new Date(Date.now() - 300000).toISOString());

      if (recentWithdrawals && recentWithdrawals.length > 0) {
        await Promise.all(recentWithdrawals.map(async (w) => {
          try {
            await supabase.functions.invoke('send-push-notification', {
              body: {
                target_id: w.user_id,
                target_type: 'individual',
                category: 'account_alerts',
                title: 'Auto-Withdrawal Initiated 🔄',
                body: `An automatic withdrawal of ${w.amount} USDT has been initiated for you!`,
                action_url: '/transactions'
              }
            });
            
            // Also trigger Telegram alert for admins
            await supabase.functions.invoke('send-telegram-alert', {
              body: {
                event_type: 'withdrawal_request',
                title: 'Auto-Withdrawal Initiated',
                details: `User ID: ${w.user_id} | Amount: ${w.amount} USDT`,
                record: { id: w.user_id } // Just the ID for context
              }
            });
          } catch (e) {
            console.error(`Failed to notify for user ${w.user_id}:`, e);
          }
        }));
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Auto-withdrawals processed successfully`,
        stats: {
          total: total_users,
          success: success_count,
          failed: fail_count,
          date: now.toISOString().split('T')[0]
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in process-auto-withdrawals function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
