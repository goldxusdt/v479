/**
 * Shared security utilities for Supabase Edge Functions
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Ideally restricted to specific domains
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Cross-Origin-Opener-Policy': 'same-origin'
}

/**
 * Enhanced SQL Injection detection (CWE-89)
 */
export function detectSQLi(input: string): boolean {
  if (typeof input !== 'string') return false;
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /insert(\s|\+)+into/i,
    /delete(\s|\+)+from/i,
    /drop(\s|\+)+table/i,
    /update[^\n]+set/i,
    /select[^\n]+from/i,
    /truncate(\s|\+)+table/i
  ];
  return sqlInjectionPatterns.some(pattern => pattern.test(input));
}

/**
 * Enhanced XSS detection (CWE-79)
 */
export function detectXSS(input: string): boolean {
  if (typeof input !== 'string') return false;
  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<[^>]+on\w+\s*=\s*['"][^'"]*['"]/gi,
    /javascript:/gi,
    /expression\s*\(/gi,
    /vbscript:/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /<object[^>]*>[\s\S]*?<\/object>/gi,
    /<embed[^>]*>[\s\S]*?<\/embed>/gi,
    /<applet[^>]*>[\s\S]*?<\/applet>/gi,
    /<meta[^>]*>/gi,
    /<link[^>]*>/gi,
    /style\s*=\s*['"][^'"]*expression\s*\(/gi,
    /data:text\/html/gi,
    /base64/gi
  ];
  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Enhanced Path Traversal detection (CWE-22)
 */
export function detectPathTraversal(input: string): boolean {
  if (typeof input !== 'string') return false;
  return /(\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e%252f|%2e%2e%5c)/.test(input);
}

/**
 * SSRF Protection - Validate external URLs (CWE-918)
 */
export function validateExternalURL(url: string, allowedDomains: string[] = []): boolean {
  try {
    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    
    // Block internal IP ranges (CWE-918)
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '0.0.0.0' ||
      hostname.startsWith('10.') ||
      hostname.startsWith('192.168.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      return false;
    }

    if (allowedDomains.length > 0) {
      return allowedDomains.some(domain => hostname === domain || hostname.endsWith('.' + domain));
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize input to prevent injection
 */
export function sanitizeInput(input: any): any {
  if (typeof input === 'string') {
    return input
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/on\w+\s*=\s*['"][^'"]*['"]/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/[<>]/g, '');
  }
  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }
  if (typeof input === 'object' && input !== null) {
    const sanitized: any = {};
    for (const key in input) {
      sanitized[key] = sanitizeInput(input[key]);
    }
    return sanitized;
  }
  return input;
}

/**
 * Rate limiting helper
 */
export async function checkRateLimit(
  supabase: any,
  ip: string,
  endpoint: string,
  limit: number = 100,
  window: number = 60 // seconds
): Promise<{ allowed: boolean; remaining: number }> {
  const windowStart = new Date(Date.now() - window * 1000).toISOString();
  
  const { count, error } = await supabase
    .from('security_events')
    .select('*', { count: 'exact', head: true })
    .eq('ip_address', ip)
    .eq('event_type', 'api_request')
    .eq('metadata->>endpoint', endpoint)
    .gte('created_at', windowStart);

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true, remaining: limit }; // Fail open but log error
  }

  const currentCount = count || 0;
  return {
    allowed: currentCount < limit,
    remaining: Math.max(0, limit - currentCount - 1)
  };
}

/**
 * Standard security response
 */
export function securityResponse(message: string, status: number = 403) {
  return new Response(JSON.stringify({ error: message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status
  });
}

/**
 * Send Telegram Alert
 */
export async function sendTelegramAlert(
  supabase: any,
  eventType: string,
  title: string,
  details: string
) {
  try {
    const { data, error } = await supabase.functions.invoke('send-telegram-alert', {
      body: { event_type: eventType, title, details }
    });
    if (error) console.error('Error invoking send-telegram-alert:', error);
    return { data, error };
  } catch (err) {
    console.error('Exception in sendTelegramAlert helper:', err);
    return { error: err };
  }
}

