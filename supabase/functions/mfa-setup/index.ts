import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as OTPAuth from 'https://esm.sh/otpauth@9.1.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Client for auth verification (use anon key for getUser)
    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await authClient.auth.getUser(token)

    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(
        JSON.stringify({ error: `Authentication failed: ${userError?.message || 'Invalid session'}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    // Client for DB operations (use service role)
    const supabaseClient = createClient(
      supabaseUrl,
      supabaseServiceKey
    )

    // Check if user is admin and if MFA is already enabled
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('role, mfa_enabled, mfa_pending_secret')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError || !profile || profile.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: `Forbidden: Admin access required. Your role: ${profile?.role || 'unknown'}` }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    if (profile.mfa_enabled) {
      return new Response(
        JSON.stringify({ error: 'MFA is already enabled for this account.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    let secretBase32 = profile.mfa_pending_secret;

    if (!secretBase32) {
      console.log(`Generating NEW MFA setup for admin: ${user.email}`)
      const secret = new OTPAuth.Secret({ size: 20 })
      secretBase32 = secret.base32

      // Store the pending secret
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ mfa_pending_secret: secretBase32 })
        .eq('id', user.id)
      
      if (updateError) {
        throw new Error(`Failed to store pending secret: ${updateError.message}`)
      }
    } else {
      console.log(`Using EXISTING pending MFA setup for admin: ${user.email}`)
    }

    const totp = new OTPAuth.TOTP({
      issuer: 'Gold X Usdt',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secretBase32),
    })

    const otpauthUrl = totp.toString()

    console.log(`MFA setup generated successfully for ${user.email}`)

    return new Response(
      JSON.stringify({ 
        secret: secretBase32, 
        otpauth_url: otpauthUrl 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error: any) {
    console.error('Exception in mfa-setup:', error)
    return new Response(
      JSON.stringify({ error: `Internal Server Error: ${error.message}` }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
