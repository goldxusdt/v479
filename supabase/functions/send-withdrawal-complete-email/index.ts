import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";
import { sendEmail } from "../_shared/email.ts";

interface RequestBody {
  email: string;
  amount: number;
  userName: string;
  planName: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, amount, userName, planName } = await req.json();

    if (!email || !amount) {
      return new Response(
        JSON.stringify({ error: "Email and amount are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #FFD700; border-radius: 10px; background-color: #0A0A0A; color: #FFFFFF;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h1 style="color: #FFD700; margin: 0;">Gold X Usdt</h1>
          <p style="color: #888; font-size: 14px;">Withdrawal Completed Successfully</p>
        </div>
        <div style="background-color: #1A1A1A; padding: 30px; border-radius: 8px; border: 1px solid rgba(255, 215, 0, 0.1);">
          <h2 style="color: #FFFFFF; margin-top: 0; font-size: 22px;">Hello ${userName},</h2>
          <p style="color: #AAA; line-height: 1.6; font-size: 16px;">
            We are pleased to inform you that your withdrawal/refund request for the investment plan <strong>${planName}</strong> has been processed successfully.
          </p>
          
          <div style="background: rgba(255, 215, 0, 0.05); padding: 20px; border-radius: 6px; margin: 25px 0; border-left: 4px solid #FFD700;">
            <p style="margin: 0; color: #888; font-size: 12px; text-transform: uppercase; font-weight: bold;">Amount Sent</p>
            <p style="margin: 5px 0 0; color: #FFD700; font-size: 28px; font-weight: bold;">${amount} USDT</p>
          </div>
          
          <p style="color: #AAA; line-height: 1.6; font-size: 14px;">
            Your withdrawal of <strong>${amount} USDT</strong> is complete and your funds have been sent to your registered wallet address. 
            The refunded amount has been deducted from your deposit wallet balance.
          </p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid rgba(255, 255, 255, 0.05); text-align: center;">
            <a href="https://goldxusdt.com/dashboard" style="background-color: #FFD700; color: #000000; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-weight: bold; font-size: 14px; display: inline-block;">
              View Dashboard
            </a>
          </div>
        </div>
        <div style="margin-top: 25px; text-align: center; font-size: 12px; color: #666; line-height: 1.5;">
          <p>Thank you for choosing Gold X Usdt for your investments.</p>
          <p>&copy; 2026 Gold X Usdt. All rights reserved.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Withdrawal Completed - ${amount} USDT`,
      html,
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending withdrawal completion email:", error);
    // Return the error message directly if it already starts with "network error"
    const errorMessage = error.message.startsWith('network error') 
      ? error.message 
      : error.message;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
