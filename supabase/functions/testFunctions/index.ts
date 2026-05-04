import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { corsHeaders } from "../_shared/security.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  return new Response(JSON.stringify({ 
    status: "online", 
    timestamp: new Date().toISOString(),
    message: "All systems operational"
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
