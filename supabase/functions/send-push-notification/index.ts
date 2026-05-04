import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";
import webpush from "https://esm.sh/web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY");
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY");
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Fetch VAPID keys from settings if not in env
    let pubKey = VAPID_PUBLIC_KEY;
    let privKey = VAPID_PRIVATE_KEY;
    let subject = VAPID_SUBJECT || "mailto:info@goldxusdt.com";

    if (!pubKey || !privKey) {
      const { data: settings } = await supabase
        .from("settings")
        .select("*")
        .in("key", ["vapid_public_key", "vapid_private_key", "vapid_subject"]);
      
      pubKey = settings?.find(s => s.key === "vapid_public_key")?.value || pubKey;
      privKey = settings?.find(s => s.key === "vapid_private_key")?.value || privKey;
      subject = settings?.find(s => s.key === "vapid_subject")?.value || subject;
    }

    if (!pubKey || !privKey) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(subject, pubKey, privKey);

    const { title, body, target_type, target_id, action_url, icon_url, category_id, created_by } = await req.json();

    let query = supabase.from("push_subscriptions").select("*");

    if (target_type === "individual" && target_id) {
      query = query.eq("user_id", target_id);
    }

    const { data: initialSubscriptions } = await query;
    let subscriptions = initialSubscriptions || [];

    // Filter by category if provided in the user's preferences
    if (category_id) {
      // Need to fetch category name to check against subscription categories
      const { data: catData } = await supabase
        .from("notification_categories")
        .select("name")
        .eq("id", category_id)
        .single();
      
      if (catData) {
        subscriptions = subscriptions.filter(sub => 
          !sub.categories || sub.categories.includes(catData.name)
        );
      }
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon_url || "/logo.png",
      data: {
        url: action_url || "/",
      },
    });

    const results = await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(sub.subscription_json, payload);
          return { success: true };
        } catch (error) {
          console.error(`Error sending to subscription ${sub.id}:`, error);
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription has expired or is no longer valid
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
          }
          return { success: false, error: error.message };
        }
      })
    );

    const stats = {
      delivered: results.filter((r) => r.success).length,
      failed: results.filter((r) => !r.success).length,
    };

    // Log in history
    await supabase.from("notification_history").insert({
      title,
      body,
      target_type,
      target_id,
      action_url,
      icon_url,
      category_id,
      created_by,
      stats: { ...stats, clicked: 0 },
    });

    return new Response(JSON.stringify({ success: true, stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
