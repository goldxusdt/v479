import { supabase } from '@/services/supabase';

// Convert base64 string to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  // If the key is in DER format (SubjectPublicKeyInfo), extract the raw 65-byte public key
  // Raw uncompressed P-256 public key starts with 0x04 and is 65 bytes long
  if (outputArray.length > 65) {
    return outputArray.slice(-65);
  }

  return outputArray;
}

export async function subscribeToPush(userId: string) {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    throw new Error('Push notifications are not supported in this browser');
  }

  const registration = await navigator.serviceWorker.ready;

  // Get VAPID public key from settings or a known place
  // For simplicity, we assume it's available in an env var or we fetch it
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .in('key', ['vapid_public_key', 'vapid_subject']) as { data: any[] | null };

  const publicVapidKey = settings?.find((s: any) => s.key === 'vapid_public_key')?.value || import.meta.env.VITE_VAPID_PUBLIC_KEY;
  // const vapidSubject = settings?.find((s: any) => s.key === 'vapid_subject')?.value || 'mailto:info@goldxusdt.com';

  if (!publicVapidKey) {
    throw new Error('VAPID public key not found');
  }

  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicVapidKey)
  });

  // Save subscription to database
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    subscription_json: subscription.toJSON(),
    updated_at: new Date().toISOString()
  } as any, { onConflict: 'user_id' });

  if (error) throw error;

  return subscription;
}

export async function unsubscribeFromPush(userId: string) {
  if (!('serviceWorker' in navigator)) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();

  if (subscription) {
    await subscription.unsubscribe();
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getSubscriptionData(userId: string) {
  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateSubscriptionPreferences(userId: string, categories: string[]) {
  const { error } = await supabase
    .from('push_subscriptions')
    // @ts-ignore
    .update({ categories })
    .eq('user_id', userId);

  if (error) throw error;
}

export async function getSubscriptionStatus(userId: string) {
  const data = await getSubscriptionData(userId);
  return !!data;
}

export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').then(
        (registration) => {
          console.log('ServiceWorker registration successful with scope: ', registration.scope);
        },
        (err) => {
          console.log('ServiceWorker registration failed: ', err);
        }
      );
    });
  }
}
