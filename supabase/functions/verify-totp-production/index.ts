import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, sanitizeInput, sendTelegramAlert } from '../_shared/security.ts';

interface RequestBody {
  email: string;
  otp?: string;
  email_otp?: string;
  totp_code?: string;
  purpose: 'signup' | 'login' | 'password_reset' | 'totp_verification' | 'password_change' | 'admin_login';
  secret?: string; 
  isBackupCode?: boolean;
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
    const { email, otp, email_otp, totp_code, purpose, secret: setupSecret, isBackupCode } = sanitizeInput(rawBody);

    if (purpose === 'admin_login' || purpose === 'totp_verification') {
       if (!email) {
         return new Response(JSON.stringify({ error: 'Email is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }
       
       const { data: profile } = await supabase.from('profiles').select('mfa_secret, mfa_enabled, mfa_locked_until, mfa_backup_codes, id, mfa_failed_attempts, mfa_pending_secret, role').eq('email', email).maybeSingle();
       if (!profile) throw new Error('User not found');
       
       if (profile.mfa_locked_until && new Date(profile.mfa_locked_until) > new Date()) {
          return new Response(JSON.stringify({ error: `MFA is temporarily locked. Try again after ${new Date(profile.mfa_locked_until).toLocaleTimeString()}` }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }

       // For admin_login, we MUST verify Email OTP first if it's provided
       if (purpose === 'admin_login') {
         if (!email_otp || !totp_code) {
           return new Response(JSON.stringify({ error: 'Both Email OTP and Authenticator code are required for Admin login' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
         }

         // Verify Email OTP
         const { data: otpRecord } = await supabase
           .from('otp_verifications')
           .select('*')
           .eq('email', email)
           .eq('otp_code', email_otp)
           .eq('purpose', 'admin_login')
           .eq('verified', false)
           .gt('expires_at', new Date().toISOString())
           .order('created_at', { ascending: false })
           .limit(1)
           .maybeSingle();

         if (!otpRecord) {
           return new Response(JSON.stringify({ error: 'Invalid or expired Email OTP' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
         }

         // Mark Email OTP as verified
         await supabase.from('otp_verifications').update({ verified: true }).eq('id', otpRecord.id);
       }

       const verificationCode = purpose === 'admin_login' ? totp_code : otp;
       if (!verificationCode) {
         return new Response(JSON.stringify({ error: 'Authenticator code is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }

       let isValid = false;
       if (isBackupCode) {
          const hashedCodes = profile.mfa_backup_codes || [];
          
          // Use SHA-256 to hash the provided backup code
          const encoder = new TextEncoder();
          const data = encoder.encode(verificationCode);
          const hashBuffer = await crypto.subtle.digest('SHA-256', data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const inputHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
          
          const matchedIdx = hashedCodes.findIndex((h: string) => h === inputHash);
          if (matchedIdx !== -1) {
             isValid = true;
             const updatedCodes = hashedCodes.filter((_: any, i: number) => i !== matchedIdx);
             await supabase.from('profiles').update({ mfa_backup_codes: updatedCodes }).eq('id', profile.id);
          }
       } else {
          const mfaSecret = setupSecret || profile.mfa_pending_secret || profile.mfa_secret;
          if (!mfaSecret) throw new Error('MFA secret not found');

          const { TOTP, Secret } = await import("https://esm.sh/otpauth@9.1.2");
          
          const totpObj = new TOTP({ 
            secret: Secret.fromBase32(mfaSecret), 
            algorithm: "SHA1", 
            digits: 6, 
            period: 30 
          });
          isValid = totpObj.validate({ token: verificationCode, window: 1 }) !== null;
       }

       if (!isValid) {
          const attempts = (profile.mfa_failed_attempts || 0) + 1;
          const updates: any = { mfa_failed_attempts: attempts };
          if (attempts >= 5) {
            updates.mfa_locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
          }
          await supabase.from('profiles').update(updates).eq('id', profile.id);

          // Log failed TOTP
          await supabase.from('admin_security_logs').insert({
            admin_id: profile.id,
            event_type: isBackupCode ? 'mfa_backup_code_failed' : 'mfa_totp_failed',
            ip_address: clientIp,
            user_agent: userAgent,
            outcome: 'failure',
            additional_details: { error: 'Invalid security code', method: isBackupCode ? 'backup_code' : 'totp' }
          });

          return new Response(JSON.stringify({ error: 'Invalid security code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }

       // Reset failed attempts on success
       await supabase.from('profiles').update({ 
         mfa_failed_attempts: 0, 
         mfa_locked_until: null 
       }).eq('id', profile.id);

       // Enrollment logic
       const enrollmentSecret = setupSecret || profile.mfa_pending_secret;
       if (enrollmentSecret && !profile.mfa_enabled) {
         const backupCodes = Array.from({ length: 10 }, () => 
           Math.random().toString(36).substring(2, 10).toUpperCase()
         );
         
         const hashedBackupCodes = await Promise.all(backupCodes.map(async (code) => {
           const encoder = new TextEncoder();
           const data = encoder.encode(code);
           const hashBuffer = await crypto.subtle.digest('SHA-256', data);
           const hashArray = Array.from(new Uint8Array(hashBuffer));
           return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
         }));

         await supabase.from('profiles').update({
           mfa_secret: enrollmentSecret,
           mfa_enabled: true,
           mfa_pending_secret: null,
           mfa_backup_codes: hashedBackupCodes
         }).eq('id', profile.id);

         // Log successful enrollment
         await supabase.from('admin_security_logs').insert({
           admin_id: profile.id,
           event_type: 'mfa_enrollment_success',
           ip_address: clientIp,
           user_agent: userAgent,
           outcome: 'success'
         });

         return new Response(JSON.stringify({ 
           success: true, 
           backup_codes: backupCodes 
         }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
       }

       // Log successful TOTP
       await supabase.from('admin_security_logs').insert({
         admin_id: profile.id,
         event_type: isBackupCode ? 'mfa_backup_code_verified' : 'mfa_totp_verified',
         ip_address: clientIp,
         user_agent: userAgent,
         outcome: 'success',
         additional_details: { method: isBackupCode ? 'backup_code' : 'totp' }
       });

       return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!email || !otp || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Email, OTP, and purpose are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- SECURITY: Rate Limiting ---
    const { data: isAllowed, error: limitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: `${clientIp}:${email}`, // Rate limit per IP + Email combination
      p_endpoint: 'verify-otp',
      p_limit: 5,
      p_window_seconds: 60
    });

    if (limitError) {
      console.error('Rate limit error:', limitError);
    }

    if (isAllowed === false) {
      return new Response(
        JSON.stringify({ error: 'Too many attempts. Please try again in 1 minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- END SECURITY ---

    // Find matching OTP
    const { data: otpRecord, error: fetchError } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('email', email)
      .eq('otp_code', otp)
      .eq('purpose', purpose)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching OTP:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to verify OTP' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired OTP' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark OTP as verified
    const { error: updateError } = await supabase
      .from('otp_verifications')
      .update({ verified: true })
      .eq('id', otpRecord.id);

    if (updateError) {
      console.error('Error updating OTP:', updateError);
      return new Response(
        JSON.stringify({ error: `Failed to complete verification: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Special logic for signup: create the actual user
    if (purpose === 'signup') {
      const { data: pendingData, error: pendingError } = await supabase
        .from('pending_signups')
        .select('*')
        .eq('email', email)
        .eq('token', otp)
        .maybeSingle();

      if (pendingError || !pendingData) {
        console.error('Failed to find pending signup:', pendingError);
        return new Response(
          JSON.stringify({ error: 'Verification successful but signup data not found. Please try registering again.' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Create user in auth.users
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: pendingData.password,
        email_confirm: true,
        user_metadata: {
          full_name: pendingData.full_name,
          phone: pendingData.phone,
          country: pendingData.country,
          referral_code: pendingData.referral_code || null
        }
      });

      if (authError) {
        console.error('Auth creation error:', authError);
        return new Response(
          JSON.stringify({ error: authError.message || 'Failed to create user account' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Clean up pending signup
      await supabase.from('pending_signups').delete().eq('email', email);

      // Trigger Telegram Alert
      await sendTelegramAlert(
        supabase,
        'new_user',
        'New User Registered',
        `User ${email} has successfully registered and verified their account.`
      );

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Account created and verified successfully',
          user: {
            id: authData.user.id,
            email: email
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, verified: true, message: 'OTP verified successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in verify-otp function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
