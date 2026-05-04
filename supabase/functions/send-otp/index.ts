import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, sanitizeInput } from '../_shared/security.ts';

interface RequestBody {
  email: string;
  purpose: 'signup' | 'login' | 'password_reset' | 'password_change' | 'admin_login';
  userData?: {
    fullName: string;
    phone: string;
    country: string;
    password?: string;
    referralCode?: string;
  }
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

    const rawBody: RequestBody = await req.json();
    const { email, purpose, userData } = sanitizeInput(rawBody);

    if (!email || !purpose) {
      return new Response(
        JSON.stringify({ error: 'Email and purpose are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // --- SECURITY: Rate Limiting ---
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown';
    const { data: isAllowed, error: limitError } = await supabase.rpc('check_rate_limit', {
      p_identifier: `${clientIp}:${email}`, // Rate limit per IP + Email combination
      p_endpoint: 'send-otp',
      p_limit: 5,
      p_window_seconds: 60
    });

    if (limitError) {
      console.error('Rate limit error:', limitError);
    }

    if (isAllowed === false) {
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again in 1 minute.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- END SECURITY ---

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    console.log(`[send-otp] OTP generated for ${email}`);

    // Set expiry to 10 minutes from now
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    // If it's a signup, we need to store the user data
    if (purpose === 'signup') {
      if (!userData) {
        return new Response(
          JSON.stringify({ error: 'User data required for signup' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // Store pending signup using the OTP as the token (or just use the email as primary key)
      try {
        await supabase.from('pending_signups').delete().eq('email', email);
        const { error: pendingError } = await supabase.from('pending_signups').insert({
          email,
          password: userData.password,
          full_name: userData.fullName,
          phone: userData.phone,
          country: userData.country,
          referral_code: userData.referralCode,
          token: otpCode, // We use the OTP as the token for consistency
          expires_at: expiresAt
        });

        if (pendingError) {
          console.error('[send-otp] Failed to store pending signup:', pendingError);
          return new Response(
            JSON.stringify({ error: `Failed to initiate signup: ${pendingError.message}` }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      } catch (e) {
        console.error('[send-otp] Exception in signup storage:', e);
      }
    }

    // Delete any existing OTPs for this email and purpose
    try {
      console.log(`[send-otp] Deleting existing OTPs for ${email}`);
      const { error: deleteError } = await supabase
        .from('otp_verifications')
        .delete()
        .eq('email', email)
        .eq('purpose', purpose);
      if (deleteError) console.warn('[send-otp] Delete existing OTPs warning:', deleteError);
    } catch (e) {
      console.warn('[send-otp] Delete existing OTPs exception:', e);
    }

    // Store OTP in database
    console.log(`[send-otp] Inserting OTP into database for ${email}`);
    const { error: insertError } = await supabase
      .from('otp_verifications')
      .insert({
        email: email,
        otp_code: otpCode,
        purpose: purpose,
        expires_at: expiresAt
      });

    if (insertError) {
      console.error('Failed to store OTP:', insertError);
      return new Response(
        JSON.stringify({ error: `Failed to generate OTP: ${insertError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Send email with OTP using SMTP
    try {
      const { sendEmail } = await import('../_shared/email.ts');
      
      const siteUrl = req.headers.get('origin') || Deno.env.get('SITE_URL') || 'https://goldxusdt.com';
      const actionUrl = purpose === 'signup' 
        ? `${siteUrl}/signup?email=${encodeURIComponent(email)}&step=otp`
        : `${siteUrl}/login?email=${encodeURIComponent(email)}&step=otp`;
      
      let buttonText = 'Confirm OTP';
      if (purpose === 'signup') buttonText = 'Verify Email';
      if (purpose === 'admin_login') buttonText = 'Verify Admin Login';

      // Email Template with placeholders for robustness
      const template = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FFD700; border-radius: 10px; background-color: #0A0A0A; color: #FFFFFF;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h1 style="color: #FFD700; margin: 0;">Gold X Usdt</h1>
            <p style="color: #888; font-size: 14px;">Secure USDT Investment Platform</p>
          </div>
          <div style="background-color: #1A1A1A; padding: 30px; border-radius: 8px; text-align: center; border: 1px solid rgba(255, 215, 0, 0.1);">
            <h2 style="color: #FFFFFF; margin-top: 0; font-size: 24px;">Verification Code</h2>
            <p style="color: #AAA; margin-bottom: 25px; font-size: 16px;">Use the code below to complete your {{purpose}} process.</p>
            
            <div style="font-size: 36px; font-weight: bold; color: #000000; letter-spacing: 8px; background: #FFD700; padding: 20px; border-radius: 6px; display: inline-block; margin-bottom: 30px; min-width: 200px; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.3);">
              {{otp_code}}
            </div>
            
            <div style="margin-bottom: 25px;">
              <a href="{{action_url}}" style="background-color: #FFD700; color: #000000; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 15px rgba(255, 215, 0, 0.2);">
                {{button_text}}
              </a>
            </div>
            
            <p style="color: #888; margin-top: 20px; font-size: 13px;">This code will expire in 10 minutes. If the button doesn't work, copy and paste the code manually.</p>
          </div>
          <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #666; line-height: 1.5;">
            <p>If you didn't request this code, please ignore this email.</p>
            <p>&copy; 2026 Gold X Usdt. All rights reserved.</p>
          </div>
        </div>
      `;

      // Replace placeholders
      const html = template
        .replace('{{otp_code}}', otpCode)
        .replace('{{purpose}}', purpose.replace('_', ' '))
        .replace('{{action_url}}', actionUrl)
        .replace('{{button_text}}', buttonText);

      await sendEmail({
        to: email,
        subject: `Your OTP Code - ${purpose.replace('_', ' ').toUpperCase()}`,
        html,
      });
      
      console.log('SMTP email sent for purpose:', purpose);

    } catch (e) {
      console.error('Failed to send email via Zoho SMTP:', e);
      // Return the error message directly if it already starts with "network error"
      const errorMessage = e.message.startsWith('network error') 
        ? e.message 
        : `Network error sending email: ${e.message}`;
        
      return new Response(
        JSON.stringify({ error: errorMessage }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'OTP sent successfully'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-otp function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
