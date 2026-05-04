import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Attempt to fetch real exchange rate (USDT to INR for example)
    // Using a public API or a fallback
    let rate = 83.50; // Fallback rate
    
    try {
      const response = await fetch("https://api.exchangerate-api.com/v4/latest/USDT");
      if (response.ok) {
        const data = await response.json();
        if (data && data.rates && data.rates.INR) {
          rate = data.rates.INR;
        }
      }
    } catch (e) {
      console.warn("Failed to fetch live exchange rate, using fallback:", e);
    }
    
    return new Response(JSON.stringify({ 
      success: true, 
      rate,
      base: "USDT",
      target: "INR",
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
