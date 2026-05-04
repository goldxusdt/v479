import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, sanitizeInput } from '../_shared/security.ts';

interface RequestBody {
  userId: string;
  otp: string;
  isBackupCode?: boolean;
  setupSecret?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || req.headers.get('cf-connecting-ip') || 'unknown';
    const userAgent = req.headers.get('user-agent') || 'unknown';

    const rawBody: RequestBody = await req.json();
    const { userId, otp, isBackupCode, setupSecret } = sanitizeInput(rawBody);

    if (!userId || !otp) {
      return new Response(JSON.stringify({ error: 'User ID and OTP are required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('mfa_secret, mfa_enabled, id, mfa_locked_until, mfa_failed_attempts, mfa_backup_codes, email, mfa_pending_secret')
      .eq('id', userId)
      .maybeSingle();

    if (profileError || !profile) throw new Error('Profile not found');

    if (profile.mfa_locked_until && new Date(profile.mfa_locked_until) > new Date()) {
      return new Response(JSON.stringify({ error: 'MFA is temporarily locked.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let isValid = false;
    if (isBackupCode) {
      const hashedCodes = profile.mfa_backup_codes || [];
      const encoder = new TextEncoder();
      const data = encoder.encode(otp);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const inputHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      
      const matchedIdx = hashedCodes.indexOf(inputHash);
      if (matchedIdx !== -1) {
        isValid = true;
        const updatedCodes = hashedCodes.filter((_: any, i: number) => i !== matchedIdx);
        await supabase.from('profiles').update({ mfa_backup_codes: updatedCodes }).eq('id', profile.id);
      }
    } else {
      const mfaSecret = setupSecret || profile.mfa_pending_secret || profile.mfa_secret;
      if (!mfaSecret) throw new Error('MFA not set up');
      
      const { TOTP, Secret } = await import("https://esm.sh/otpauth@9.1.2");
      const totp = new TOTP({
        issuer: "Gold X Usdt",
        label: profile.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: Secret.fromBase32(mfaSecret),
      });
      isValid = totp.validate({ token: otp, window: 1 }) !== null;
    }

    if (!isValid) {
      const attempts = (profile.mfa_failed_attempts || 0) + 1;
      const updates: any = { mfa_failed_attempts: attempts };
      if (attempts >= 5) updates.mfa_locked_until = new Date(Date.now() + 1800000).toISOString();
      await supabase.from('profiles').update(updates).eq('id', profile.id);
      
      await supabase.from('admin_security_logs').insert({
        admin_id: profile.id,
        event_type: isBackupCode ? 'mfa_backup_code_failed' : 'mfa_totp_failed',
        ip_address: clientIp,
        user_agent: userAgent,
        outcome: 'failure'
      });
      
      throw new Error('Invalid code');
    }

    // Success logic
    await supabase.from("profiles").update({ mfa_failed_attempts: 0, mfa_locked_until: null }).eq("id", profile.id);

    // If it was a setup phase
    if ((setupSecret || profile.mfa_pending_secret) && !profile.mfa_enabled) {
      const backupCodes = Array.from({ length: 10 }, () => Math.random().toString(36).substring(2, 10).toUpperCase());
      const hashedBackupCodes = await Promise.all(backupCodes.map(async (code) => {
        const encoder = new TextEncoder();
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(code));
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      }));
      
      await supabase.from("profiles").update({ 
        mfa_secret: setupSecret || profile.mfa_pending_secret, 
        mfa_enabled: true, 
        mfa_backup_codes: hashedBackupCodes,
        mfa_pending_secret: null 
      }).eq("id", profile.id);
      
      return new Response(JSON.stringify({ success: true, backup_codes: backupCodes }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
  }
});
