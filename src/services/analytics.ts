/**
 * Google Analytics 4 Integration Utilities
 */

import { useSettings } from '@/contexts/SettingsContext';

/**
 * Hook to use analytics
 */
export function useAnalytics() {
  const { settings } = useSettings();
  const gaId = settings?.ga_measurement_id;

  /**
   * Track a custom event
   */
  const trackEvent = (eventName: string, params: Record<string, any> = {}) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', eventName, params);
      console.log(`[Analytics] Event tracked: ${eventName}`, params);
    }
  };

  /**
   * Track user sign-in
   */
  const trackSignIn = (method: 'email' | 'google') => {
    trackEvent('login', {
      method: method,
    });
  };

  /**
   * Track user sign-up
   */
  const trackSignUp = (method: 'email' | 'google') => {
    trackEvent('sign_up', {
      method: method,
    });
  };

  /**
   * Track investment deposit
   */
  const trackDeposit = (amount: number, currency: string = 'USDT') => {
    trackEvent('purchase', {
      transaction_id: `DEP_${Date.now()}`,
      value: amount,
      currency: currency,
      items: [
        {
          item_id: 'USDT_DEPOSIT',
          item_name: 'USDT Deposit',
          price: amount,
          quantity: 1,
        },
      ],
    });
  };

  /**
   * Track ROI payout engagement
   */
  const trackROIPayout = (amount: number) => {
    trackEvent('roi_payout', {
      value: amount,
      currency: 'USDT',
    });
  };

  /**
   * Track specific funnel steps
   */
  const trackFunnelStep = (stepName: string, stepNumber: number) => {
    trackEvent('funnel_step', {
      step_name: stepName,
      step_number: stepNumber,
    });
  };

  return {
    trackEvent,
    trackSignIn,
    trackSignUp,
    trackDeposit,
    trackROIPayout,
    trackFunnelStep,
    isEnabled: !!gaId,
  };
}
