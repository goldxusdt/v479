import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const AUTHORIZED_CHAT_ID = Deno.env.get("TELEGRAM_CHAT_ID");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

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
    const update = await req.json();
    console.log("Telegram update received:", JSON.stringify(update));

    // 1. Verify Sender Chat ID
    const senderId = update.message?.chat?.id?.toString() || update.callback_query?.message?.chat?.id?.toString();
    if (senderId !== AUTHORIZED_CHAT_ID) {
      console.warn("Unauthorized Telegram sender:", senderId);
      return new Response("Unauthorized", { status: 403 });
    }

    // 2. Handle Callback Queries (Buttons)
    if (update.callback_query) {
      const { data: callbackData, message: callbackMsg, id: callbackQueryId } = update.callback_query;
      const [action, targetId] = callbackData.split(':');

      let responseText = "";

      if (action === 'approve_withdrawal') {
        const { data, error } = await supabase.rpc('process_withdrawal_approval', {
          p_withdrawal_id: targetId,
          p_admin_id: "00000000-0000-0000-0000-000000000000", // System/Admin UUID (usually we should find a real admin or have a system admin)
          p_approved: true,
          p_notes: 'Approved via Telegram'
        });
        responseText = error ? `❌ Error approving: ${error.message}` : "✅ Withdrawal Approved successfully!";
      } else if (action === 'reject_withdrawal') {
        const { data, error } = await supabase.rpc('process_withdrawal_approval', {
          p_withdrawal_id: targetId,
          p_admin_id: "00000000-0000-0000-0000-000000000000",
          p_approved: false,
          p_notes: 'Rejected via Telegram'
        });
        responseText = error ? `❌ Error rejecting: ${error.message}` : "❌ Withdrawal Rejected!";
      } else if (action === 'reply_ticket') {
        responseText = "💬 Please reply directly to this message to send your response to the user.";
      }

      // Answer callback query to stop the loading spinner in Telegram
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ callback_query_id: callbackQueryId, text: responseText })
      });

      // Update original message to remove buttons
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: AUTHORIZED_CHAT_ID,
          message_id: callbackMsg.message_id,
          reply_markup: { inline_keyboard: [] }
        })
      });

      // Send confirmation message
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: AUTHORIZED_CHAT_ID,
          text: responseText,
          reply_to_message_id: callbackMsg.message_id
        })
      });
    }

    // 3. Handle Direct Replies (Support Tickets)
    if (update.message?.reply_to_message) {
      const originalMessageId = update.message.reply_to_message.message_id.toString();
      const replyText = update.message.text;

      // Find the ticket linked to this message ID
      const { data: ticket, error: ticketError } = await supabase
        .from('support_tickets')
        .select('id, user_id')
        .eq('telegram_message_id', originalMessageId)
        .maybeSingle();

      if (ticket) {
        // Insert reply into ticket_replies
        const { error: replyError } = await supabase.from('ticket_replies').insert({
          ticket_id: ticket.id,
          user_id: "00000000-0000-0000-0000-000000000000", // System/Admin ID
          message: replyText,
          is_admin: true
        });

        if (!replyError) {
          // Send push notification to user (optional but good)
          await supabase.functions.invoke('send-push-notification', {
            body: {
              user_id: ticket.user_id,
              title: "Support Ticket Reply",
              body: `An admin has replied to your ticket: "${replyText.substring(0, 50)}..."`
            }
          });

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: AUTHORIZED_CHAT_ID,
              text: "✅ Reply sent to user successfully!",
              reply_to_message_id: update.message.message_id
            })
          });
        } else {
          console.error("Error saving ticket reply:", replyError);
        }
      }
    }

    return new Response("ok", { headers: corsHeaders });
  } catch (error) {
    console.error("Error in Telegram webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
