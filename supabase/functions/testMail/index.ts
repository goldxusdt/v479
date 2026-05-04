import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { sendEmail } from "../_shared/email.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { to } = await req.json();

    if (!to) {
      return new Response(
        JSON.stringify({ error: "Recipient 'to' is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    await sendEmail({
      to,
      subject: "Test Email from Gold X Usdt",
      html: "<h1>SMTP Configuration Working!</h1><p>Your SMTP settings are correctly configured in the environment variables.</p>"
    });

    return new Response(JSON.stringify({ success: true, message: "Test email sent" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in testMail function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
