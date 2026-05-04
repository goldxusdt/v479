import * as React from 'react';
import { supabase } from '@/services/supabase';
import type { User } from '@supabase/supabase-js';
import type { Profile } from '@/types';
import { toast } from 'sonner';
import { invokeEdgeFunction } from '@/services/functions';
import { useAnalytics } from '@/services/analytics';
import { getDeviceFingerprint, getGeolocationData } from '@/services/security';

const MAX_SESSION_DURATION = 60 * 60 * 1000; // 1 hour
const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes
const WARNING_BEFORE = 2 * 60 * 1000; // 2 minutes

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  mfaVerified: boolean;
  setMfaVerified: (verified: boolean) => void;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<{ 
    error: Error | null; 
  }>;
  signUpWithEmail: (
    email: string, 
    password: string, 
    referralCode?: string,
    additionalData?: { full_name?: string; phone?: string; country?: string }
  ) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  verifyOTP: (email: string, token: string, purpose?: 'signup' | 'login' | 'password_reset') => Promise<{ error: Error | null }>;
  resendOTP: (email: string, purpose?: 'signup' | 'login' | 'password_reset', userData?: Record<string, unknown>) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const lastActivityRef = React.useRef<number>(Date.now());
  const warningShownRef = React.useRef<boolean>(false);

  const [user, setUser] = React.useState<User | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [mfaVerified, setMfaVerifiedState] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const profileChannelRef = React.useRef<any>(null);

  const setMfaVerified = (verified: boolean) => {
    setMfaVerifiedState(verified);
    if (verified) {
      sessionStorage.setItem('mfa_verified', 'true');
    } else {
      sessionStorage.removeItem('mfa_verified');
    }
  };

  React.useEffect(() => {
    const isMfaVerified = sessionStorage.getItem('mfa_verified') === 'true';
    setMfaVerifiedState(isMfaVerified);
  }, []);
  const { trackSignIn, trackSignUp } = useAnalytics();

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    const profileData = await getProfile(user.id);
    setProfile(profileData);
  };

  React.useEffect(() => {
    supabase
      .auth
      .getSession()
      .then(async ({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          const profileData = await getProfile(session.user.id);
          setProfile(profileData);
        }
      })
      .catch(error => {
        // @ts-ignore
        toast.error(`Failed to get user session: ${(error as any).message}`);
      })
      .finally(() => {
        setLoading(false);
      });

    // In this function, do NOT use any await calls. Use `.then()` instead to avoid deadlocks.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      
      if (event === 'SIGNED_IN' && session?.user) {
        const method = session.user.app_metadata.provider === 'google' ? 'google' : 'email';
        trackSignIn(method);
      }

      if (session?.user) {
        // Subscribe to profile changes to handle immediate logout on deletion
        if (profileChannelRef.current) {
          supabase.removeChannel(profileChannelRef.current);
        }

        profileChannelRef.current = supabase
          .channel(`profile_status_${session.user.id}`)
          .on('postgres_changes', {
            event: 'DELETE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${session.user.id}`
          }, () => {
            console.log('User profile deleted, signing out...');
            toast.error('Your account has been removed. Signing out.');
            signOut();
          })
          .subscribe();

        // Use a small delay to ensure trigger has finished and profile is visible
        const checkReferral = (retryCount = 0) => {
          getProfile(session.user.id).then((p) => {
            if (p) {
              setProfile(p);
              
              const isUserAdmin = p.role === 'admin';
              if (isUserAdmin) {
                // Admin specific logic if needed
              }
              
              // Handle referral if user is new and was just created
              const ref = sessionStorage.getItem('referral_code');
              if (!p.referrer_id && ref) {
                const userCreated = new Date(session.user.created_at).getTime();
                const now = new Date().getTime();
                // If user was created in the last 2 minutes, try to attribute referral
                if (now - userCreated < 120000) {
                  supabase.from('public_profiles').select('id').eq('referral_code', ref).maybeSingle().then(({ data: referrer }) => {
                    if (referrer) {
                      (supabase.from('profiles') as any).update({ referrer_id: (referrer as any).id }).eq('id', session.user.id).then(() => {
                        console.log('Referral attributed successfully');
                        sessionStorage.removeItem('referral_code');
                        refreshProfile();
                      });
                    }
                  });
                }
              }
            } else if (retryCount < 3) {
              // Retry fetching profile if not found yet (replication/trigger lag)
              setTimeout(() => checkReferral(retryCount + 1), 1000);
            }
          });
        };
        
        checkReferral();
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (profileChannelRef.current) {
        supabase.removeChannel(profileChannelRef.current);
      }
    };
  }, []);

  // Session Security Logic
  React.useEffect(() => {
    if (!user) {
      localStorage.removeItem('session_start_time');
      localStorage.removeItem('last_activity');
      return;
    }

    // Initialize or load session start time
    const storedStartTime = localStorage.getItem('session_start_time');
    const startTime = storedStartTime ? parseInt(storedStartTime) : Date.now();
    
    if (!storedStartTime) {
      localStorage.setItem('session_start_time', startTime.toString());
    }

    // Initialize last activity
    const storedLastActivity = localStorage.getItem('last_activity');
    lastActivityRef.current = storedLastActivity ? parseInt(storedLastActivity) : Date.now();
    if (!storedLastActivity) {
      localStorage.setItem('last_activity', lastActivityRef.current.toString());
    }

    const updateActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      localStorage.setItem('last_activity', now.toString());
      warningShownRef.current = false;
    };

    // Events to track activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(event => window.addEventListener(event, updateActivity));

    // Listen for storage events to sync across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'last_activity' && e.newValue) {
        lastActivityRef.current = parseInt(e.newValue);
        warningShownRef.current = false;
      }
      if (e.key === 'session_start_time' && !e.newValue) {
        // Session cleared in another tab
        signOut();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    const interval = setInterval(() => {
      const now = Date.now();
      
      // 1. Check Maximum Session Duration (1 hour)
      const sessionElapsed = now - startTime;
      if (sessionElapsed >= MAX_SESSION_DURATION) {
        clearInterval(interval);
        toast.error('Your session has expired (max 1 hour). Please log in again.');
        signOut();
        return;
      }

      // 2. Check Inactivity (15 minutes)
      const inactivityElapsed = now - lastActivityRef.current;
      if (inactivityElapsed >= INACTIVITY_TIMEOUT) {
        clearInterval(interval);
        toast.error('You have been logged out due to inactivity.');
        signOut();
        return;
      }

      // 3. Show Warnings
      const timeToInactivity = INACTIVITY_TIMEOUT - inactivityElapsed;
      const timeToMaxSession = MAX_SESSION_DURATION - sessionElapsed;

      if (!warningShownRef.current && (timeToInactivity <= WARNING_BEFORE || timeToMaxSession <= WARNING_BEFORE)) {
        warningShownRef.current = true;
        const remaining = Math.min(timeToInactivity, timeToMaxSession);
        const minutes = Math.floor(remaining / 60000);
        const seconds = Math.floor((remaining % 60000) / 1000);
        
        toast.warning(
          `Your session will expire in ${minutes}:${seconds < 10 ? '0' : ''}${seconds} due to ${
            timeToInactivity < timeToMaxSession ? 'inactivity' : 'maximum session duration'
          }. Please save your work or interact to stay logged in.`,
          { duration: 10000 }
        );
      }
    }, 10000); // Check every 10 seconds

    return () => {
      events.forEach(event => window.removeEventListener(event, updateActivity));
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [user]);


  const signInWithEmail = async (email: string, password: string) => {
    try {
      const { data: userProfile } = await (supabase
        .from('profiles') as any)
        .select('role')
        .eq('email', email)
        .maybeSingle();

      const isUserAdmin = userProfile?.role === 'admin';

      // Capture security data
      const fingerprint = await getDeviceFingerprint();
      const geolocation = await getGeolocationData();
      const ipAddress = geolocation?.ip || 'browser_client';

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (isUserAdmin) {
          await (supabase.from('admin_security_logs') as any).insert({
            event_type: 'admin_password_failed',
            ip_address: ipAddress,
            user_agent: navigator.userAgent,
            outcome: 'failure',
            geolocation,
            device_fingerprint: fingerprint,
            additional_details: { email, error: (error as any).message }
          });
        }
        
        if ((error as any).message.includes('provider is not enabled') || (error as any).message.includes('Unsupported provider')) {
          throw new Error('Email login is not currently enabled for this platform. Please contact support.');
        }
        throw error;
      }

      if (isUserAdmin && authData.user) {
        await (supabase.from('admin_security_logs') as any).insert({
          admin_id: authData.user.id,
          event_type: 'admin_login_success',
          ip_address: ipAddress,
          user_agent: navigator.userAgent,
          outcome: 'success',
          geolocation,
          device_fingerprint: fingerprint,
          additional_details: { email }
        });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithEmail = async (
    email: string, 
    password: string, 
    referralCode?: string,
    additionalData?: { full_name?: string; phone?: string; country?: string }
  ) => {
    try {
      // Use provided code or check session storage
      const finalReferralCode = referralCode || sessionStorage.getItem('referral_code');

      // Check if referral code is valid
      if (finalReferralCode) {
        const { data: referrer } = await supabase
          .from('profiles')
          .select('id')
          .eq('referral_code', finalReferralCode)
          .maybeSingle();

        if (!referrer) {
          console.warn('Invalid referral code provided, proceeding without referrer');
        }
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            referral_code: finalReferralCode || null,
            full_name: additionalData?.full_name,
            phone: additionalData?.phone,
            country: additionalData?.country
          }
        }
      });

      if (error) {
        if ((error as any).message.includes('provider is not enabled') || (error as any).message.includes('Unsupported provider')) {
          throw new Error('Email registration is not currently enabled for this platform. Please contact support.');
        }
        throw error;
      }

      // Update profile with additional data if user was created
      // This is now redundant as handle_new_user trigger handles metadata, 
      // but we keep it as a fallback, ensuring it doesn't block the return.
      if (data.user && additionalData) {
        trackSignUp('email');
        supabase
          .from('profiles')
          // @ts-ignore - Supabase type inference issue
          .update({
            full_name: additionalData.full_name,
            phone: additionalData.phone,
            country: additionalData.country
          })
          .eq('id', data.user.id)
          .then(({ error: updateError }) => {
            if (updateError) console.warn('Secondary profile update failed (likely RLS), but user was created:', updateError);
          });
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        // Provide more helpful error for disabled providers
        if ((error as any).message.includes('provider is not enabled') || (error as any).message.includes('Unsupported provider')) {
          throw new Error('Google Sign-In is not currently enabled for this platform. Please enable it in the Supabase Dashboard using Client ID: 177188909353-25feb1b7el138ljg1r1ch1oc1j2g73cl.apps.googleusercontent.com');
        }
        throw error;
      }
      if (data?.url) {
        window.location.assign(data.url);
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const verifyOTP = async (email: string, token: string, purpose: 'signup' | 'login' | 'password_reset' = 'signup') => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token;

      const { data, error } = await invokeEdgeFunction('verify-otp', {
        body: { email, otp: token, purpose },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      if (error) throw error;
      
      if (data?.user) {
        console.log('OTP verified, user found:', data.user.email);
        setUser(data.user);
      } else {
        console.log('OTP verified successfully but no user or redirect URL returned');
      }
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resendOTP = async (email: string, purpose: 'signup' | 'login' | 'password_reset' = 'signup', userData?: Record<string, unknown>) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authToken = sessionData.session?.access_token;

      const { error } = await invokeEdgeFunction('send-otp', {
        body: { email, purpose, userData },
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : {}
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;
      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

   const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    setMfaVerified(false);
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <AuthContext.Provider value={{ 
      user, profile, isAdmin, mfaVerified, setMfaVerified, loading,
      signInWithEmail, signUpWithEmail, signInWithGoogle, verifyOTP, resendOTP, 
      resetPassword, signOut, refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
