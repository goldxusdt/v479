import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, sanitizeInput } from '../_shared/security.ts';

interface RequestBody {
  user_id: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get admin ID from Auth and check role
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), { status: 401, headers: corsHeaders });
    }

    const { data: { user: adminUser }, error: userError } = await supabase.auth.getUser(authHeader.split(' ')[1]);
    if (userError || !adminUser) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    // Check if the caller is an admin
    const { data: adminProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', adminUser.id)
      .single();

    if (adminProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    const rawBody = await req.json();
    const { user_id } = sanitizeInput(rawBody);

    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Call PostgreSQL function to handle audit and recalculate referral chain BEFORE deletion
    const { error: rpcError } = await supabase.rpc('process_user_deletion_and_recalculate_referral_chain', {
      target_user_id: user_id,
      admin_id: adminUser.id
    });

    if (rpcError) {
      console.error('RPC error:', rpcError);
      return new Response(
        JSON.stringify({ error: 'Cleanup failed: ' + rpcError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Force logout the user before deletion to invalidate current sessions
    await supabase.auth.admin.signOut(user_id);

    // Delete user from auth (this will cascade to profiles due to foreign key)
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User deleted successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in delete-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
