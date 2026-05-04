import { createClient } from 'jsr:@supabase/supabase-js@2';
import { corsHeaders, sanitizeInput, sendTelegramAlert } from '../_shared/security.ts';

interface RequestBody {
  email: string;
  password: string;
  full_name: string;
  role: 'user' | 'admin';
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

    // Verify the caller is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing Authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller }, error: callerError } = await supabase.auth.getUser(token);
    
    if (callerError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: callerProfile } = await supabase.from('profiles').select('role').eq('id', caller.id).maybeSingle();
    if (!callerProfile || callerProfile.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized: Admin role required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const rawBody: RequestBody = await req.json();
    const { email, password, full_name, role } = sanitizeInput(rawBody);

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Email, password, and full name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user in auth.users
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: role || 'user'
      }
    });

    if (authError) {
      console.error('Auth error:', authError);
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Since we set email_confirm: true, the trigger on_auth_user_confirmed will handle profile creation
    // But we'll wait a brief moment or manually ensure it's there
    // The trigger handles wallets too.

    // Update profile just in case some info was missing or for KYC status
    try {
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({ kyc_status: 'pending' })
        .eq('id', authData.user.id);
        
      if (profileUpdateError) {
        console.warn('Profile update warning (user was created but profile update failed):', profileUpdateError);
      }
    } catch (e) {
      console.warn('Profile update exception:', e);
    }

    // Log action
    await supabase.from('activity_logs').insert({
      user_id: authData.user.id,
      action: 'user_created',
      description: `User ${email} created by admin`,
      metadata: { role, created_by: 'admin' }
    });

    // Trigger Telegram Alert
    await sendTelegramAlert(
      supabase,
      'new_user',
      'User Created by Admin',
      `Admin created user ${email} with role ${role}.`
    );

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'User created successfully',
        user: {
          id: authData.user.id,
          email,
          full_name,
          role
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
