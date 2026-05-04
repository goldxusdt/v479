import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import * as OTPAuth from "https://deno.land/x/otpauth@v9.1.2/dist/otpauth.esm.js"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    )

    const authHeader = req.headers.get("Authorization")!
    const token = authHeader.replace("Bearer ", "")
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token)

    if (userError || !user) throw new Error("Unauthorized")

    const { otp, secret: setupSecret, isBackupCode } = await req.json()
    if (!otp) throw new Error("OTP is required")

    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("mfa_secret, mfa_enabled, id, mfa_locked_until, mfa_failed_attempts, mfa_backup_codes, email")
      .eq("id", user.id)
      .maybeSingle()

    if (profileError || !profile) throw new Error("Profile not found")

    if (profile.mfa_locked_until && new Date(profile.mfa_locked_until) > new Date()) {
      throw new Error("MFA locked")
    }

    let isValid = false
    if (isBackupCode) {
      const hashedCodes = profile.mfa_backup_codes || []
      const encoder = new TextEncoder()
      const data = encoder.encode(otp)
      const hashBuffer = await crypto.subtle.digest("SHA-256", data)
      const inputHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")
      const matchedIdx = hashedCodes.indexOf(inputHash)
      if (matchedIdx !== -1) {
        isValid = true
        const updatedCodes = hashedCodes.filter((_: any, i: number) => i !== matchedIdx)
        await supabaseClient.from("profiles").update({ mfa_backup_codes: updatedCodes }).eq("id", profile.id)
      }
    } else {
      const mfaSecret = setupSecret || profile.mfa_secret
      if (!mfaSecret) throw new Error("MFA not set up")
      const totp = new OTPAuth.TOTP({
        issuer: "Gold X Usdt",
        label: profile.email,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(mfaSecret),
      })
      isValid = totp.validate({ token: otp, window: 1 }) !== null
    }

    if (!isValid) {
      const attempts = (profile.mfa_failed_attempts || 0) + 1
      const updates: any = { mfa_failed_attempts: attempts }
      if (attempts >= 5) updates.mfa_locked_until = new Date(Date.now() + 1800000).toISOString()
      await supabaseClient.from("profiles").update(updates).eq("id", profile.id)
      throw new Error("Invalid code")
    }

    await supabaseClient.from("profiles").update({ mfa_failed_attempts: 0, mfa_locked_until: null }).eq("id", profile.id)

    if (setupSecret && !profile.mfa_enabled) {
      const backupCodes = Array.from({ length: 10 }, () => Math.random().toString(36).substring(2, 10).toUpperCase())
      const hashedBackupCodes = await Promise.all(backupCodes.map(async (code) => {
        const encoder = new TextEncoder()
        const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(code))
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("")
      }))
      await supabaseClient.from("profiles").update({ mfa_secret: setupSecret, mfa_enabled: true, mfa_backup_codes: hashedBackupCodes }).eq("id", profile.id)
      return new Response(JSON.stringify({ success: true, backup_codes: backupCodes }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 })
  }
})
