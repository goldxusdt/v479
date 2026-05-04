import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { sendEmail } from "../_shared/email.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, link } = await req.json();

    if (!email || !link) {
      return new Response(
        JSON.stringify({ error: "Email and Link are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await sendEmail({
      to: email,
      subject: "Login to Gold X Usdt",
      html: `<p>Click the link below to sign in:</p><a href="${link}">${link}</a>`
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
