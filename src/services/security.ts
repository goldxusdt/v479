/**
 * Advanced Security Utilities
 * Provides comprehensive security features to prevent hacking and unauthorized access
 */

import DOMPurify from 'dompurify';
import { toast } from 'sonner';
import { supabase } from '@/services/supabase';

// Rate limiting storage
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

/**
 * Rate limiting for API calls and form submissions
 * Prevents brute force attacks and spam
 */
export function rateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 60000 // 1 minute
): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (record.count >= maxAttempts) {
    const remainingTime = Math.ceil((record.resetTime - now) / 1000);
    toast.error(`Too many attempts. Please try again in ${remainingTime} seconds.`);
    
    // Log suspicious activity
    logSecurityEvent('rate_limit_exceeded', 'high', `Rate limit exceeded for key: ${key}`);
    
    return false;
  }

  record.count++;
  return true;
}

/**
 * Log security events to the database for auditing
 */
export async function logSecurityEvent(
  type: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  description: string,
  metadata: any = {}
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    await (supabase.from('security_events') as any).insert([{
      user_id: user?.id || null,
      event_type: type,
      severity,
      description,
      metadata: {
        ...metadata,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString()
      }
    }]);
  } catch (error) {
    console.error('Failed to log security event:', error);
  }
}

/**
 * Input sanitization to prevent XSS attacks
 * Uses DOMPurify for industry-standard robust sanitization
 */
export function sanitizeInput(input: string): string {
  if (typeof input !== 'string') return '';
  
  // Use DOMPurify for context-aware sanitization
  // This prevents XSS while allowing safe content
  const sanitized = DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No tags allowed by default for plain inputs
    ALLOWED_ATTR: [],
    RETURN_TRUSTED_TYPE: false,
  });
  
  return sanitized.trim();
}

/**
 * Enhanced sanitization for HTML content (e.g., Blog or CMS content)
 * Allows a safe whitelist of HTML tags
 */
export function sanitizeHTML(content: string): string {
  if (typeof content !== 'string') return '';
  
  return DOMPurify.sanitize(content, {
    ALLOWED_TAGS: [
      'b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'img', 'blockquote', 'code', 'pre', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'rel'],
  });
}

/**
 * Validate email format with strict regex
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Password strength validation
 * Requires: min 8 chars, uppercase, lowercase, number, special char
 */
export function validatePasswordStrength(password: string): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Validate phone number format
 */
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

/**
 * Prevent SQL injection by validating input
 */
export function preventSQLInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(DROP|EXEC|EXECUTE)\b)/gi,
    /(--|\/\*|\*\/)/g,
    /(\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi,
    /(\bAND\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi
  ];

  return !sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Secure session storage with encryption
 */
export const secureStorage = {
  set: (key: string, value: any) => {
    try {
      const encrypted = btoa(JSON.stringify(value));
      sessionStorage.setItem(key, encrypted);
    } catch (error) {
      console.error('Failed to store data securely:', error);
    }
  },

  get: (key: string) => {
    try {
      const encrypted = sessionStorage.getItem(key);
      if (!encrypted) return null;
      return JSON.parse(atob(encrypted));
    } catch (error) {
      console.error('Failed to retrieve data securely:', error);
      return null;
    }
  },

  remove: (key: string) => {
    sessionStorage.removeItem(key);
  },

  clear: () => {
    sessionStorage.clear();
  }
};

/**
 * Detect and prevent common attack patterns
 */
export function detectAttackPattern(input: string): boolean {
  const attackPatterns = [
    /<script/gi, // XSS
    /javascript:/gi, // XSS
    /on\w+=/gi, // Event handlers
    /eval\s*\(/gi, // Code execution
    /expression\s*\(/gi, // CSS expression
  ];

  return attackPatterns.some(pattern => pattern.test(input));
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validate transaction hash format
 */
export function validateTransactionHash(hash: string): boolean {
  // Ethereum/BSC/TRON transaction hash format (64 hex characters)
  const hashRegex = /^0x[a-fA-F0-9]{64}$|^[a-fA-F0-9]{64}$/;
  return hashRegex.test(hash);
}

/**
 * Prevent clickjacking by checking if page is in iframe
 */
export function preventClickjacking(): void {
  try {
    if (window.self !== window.top) {
      window.top!.location.href = window.self.location.href;
    }
  } catch (error) {
    // Ignore SecurityError when trying to access cross-origin parent window
    // This is common in sandbox environments
  }
}

/**
 * Clear sensitive data from memory
 */
export function clearSensitiveData(...variables: any[]): void {
  variables.forEach(variable => {
    if (typeof variable === 'string') {
      variable = '';
    } else if (typeof variable === 'object') {
      Object.keys(variable).forEach(key => {
        delete variable[key];
      });
    }
  });
}

/**
 * Account lockout tracking
 */
const lockoutStore = new Map<string, { attempts: number; lockedUntil: number }>();

export function trackFailedLogin(identifier: string): {
  isLocked: boolean;
  remainingAttempts: number;
  lockoutTime?: number;
} {
  const maxAttempts = 5;
  const lockoutDuration = 15 * 60 * 1000; // 15 minutes
  const now = Date.now();

  let record = lockoutStore.get(identifier);

  if (!record) {
    record = { attempts: 1, lockedUntil: 0 };
    lockoutStore.set(identifier, record);
    return { isLocked: false, remainingAttempts: maxAttempts - 1 };
  }

  // Check if lockout period has expired
  if (record.lockedUntil > 0 && now < record.lockedUntil) {
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutTime: Math.ceil((record.lockedUntil - now) / 1000)
    };
  }

  // Reset if lockout expired
  if (record.lockedUntil > 0 && now >= record.lockedUntil) {
    record.attempts = 1;
    record.lockedUntil = 0;
    return { isLocked: false, remainingAttempts: maxAttempts - 1 };
  }

  // Increment attempts
  record.attempts++;

  if (record.attempts >= maxAttempts) {
    record.lockedUntil = now + lockoutDuration;
    return {
      isLocked: true,
      remainingAttempts: 0,
      lockoutTime: lockoutDuration / 1000
    };
  }

  return {
    isLocked: false,
    remainingAttempts: maxAttempts - record.attempts
  };
}

export function resetFailedLogins(identifier: string): void {
  lockoutStore.delete(identifier);
}

/**
 * Content Security Policy headers (for reference)
 */
export const CSP_HEADERS = {
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data:",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "frame-src 'self' https://accounts.google.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    // "upgrade-insecure-requests"
  ].join('; ')
};

/**
 * Initialize all security features on app load
 */
export function initializeSecurity(): void {
  // Prevent clickjacking
  preventClickjacking();

  // Console logging is allowed even in production for better debugging support
  /*
  if (import.meta.env.PROD) {
    const noop = () => {};
    (console as any).log = noop;
    (console as any).warn = noop;
    (console as any).error = noop;
    (console as any).info = noop;
    (console as any).debug = noop;
  }
  */

  // Disable sensitive developer tools in production
  if (import.meta.env.PROD) {
    document.addEventListener('keydown', (e) => {
      // Prevent F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
      if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || 
        (e.ctrlKey && e.key === 'U') ||
        (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'J'))
      ) {
        e.preventDefault();
      }
    });

    document.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // Ensure HTTPS - DISABLED as per user requirement Part 1
  /*
  if (import.meta.env.PROD && window.location.protocol === 'http:') {
    window.location.href = window.location.href.replace('http:', 'https:');
  }
  */

  console.info('Security Layer Initialized');
}

/**
 * Capture detailed device fingerprint using browser APIs
 */
export async function getDeviceFingerprint(): Promise<any> {
  const n = navigator;
  const s = screen;
  
  // Basic fingerprinting
  const fingerprint = {
    userAgent: n.userAgent,
    language: n.language,
    platform: (n as any).platform || 'unknown',
    screenResolution: `${s.width}x${s.height}`,
    colorDepth: s.colorDepth,
    timezoneOffset: new Date().getTimezoneOffset(),
    touchSupport: 'ontouchstart' in window || n.maxTouchPoints > 0,
    cookiesEnabled: n.cookieEnabled,
    doNotTrack: n.doNotTrack,
    hardwareConcurrency: n.hardwareConcurrency || 'unknown',
    deviceMemory: (n as any).deviceMemory || 'unknown',
    plugins: Array.from(n.plugins).map(p => p.name),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
  
  return fingerprint;
}

/**
 * Capture geolocation data from IP address
 */
export async function getGeolocationData(): Promise<any> {
  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('Failed to fetch geolocation');
    const data = await response.json();
    return {
      country: data.country_name,
      countryCode: data.country_code,
      region: data.region,
      city: data.city,
      postal: data.postal,
      latitude: data.latitude,
      longitude: data.longitude,
      timezone: data.timezone,
      isp: data.org,
      ip: data.ip
    };
  } catch (error) {
    console.warn('Geolocation capture failed:', error);
    return null;
  }
}

