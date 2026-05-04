
/**
 * MONITORING AND ALERT SETUP GUIDE
 * 
 * 1. Vercel Analytics & Speed Insights
 * - These are already integrated into App.tsx.
 * - To view data: Login to Vercel Dashboard > Select Project > Analytics/Speed Insights tabs.
 * - Set up alerts: Settings > Notifications > Performance Regressions.
 * 
 * 2. Supabase Logging
 * - Edge Function Logs: Supabase Dashboard > Edge Functions > [Function Name] > Logs.
 * - Database Logs: Supabase Dashboard > Reports > Database.
 * 
 * 3. Critical Issue Alerting
 * - The project includes a 'send-telegram-alert' Edge Function.
 * - Configure your Telegram Bot Token and Chat ID in Supabase Secrets:
 *   supabase secrets set TELEGRAM_BOT_TOKEN=... TELEGRAM_CHAT_ID=...
 * - Errors in critical flows (e.g., ROI payout) automatically trigger these alerts.
 * 
 * 4. Error Handling Type Safety
 * - Catch blocks now use 'unknown' instead of 'any'.
 * - Use 'getErrorMessage(error)' from '@/utils/error' to safely extract messages.
 */
export const monitoringConfig = {
  provider: 'Vercel',
  services: ['Analytics', 'Speed Insights'],
  database: 'Supabase',
  alerting: 'Telegram / Email'
};
