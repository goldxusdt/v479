/**
 * Comprehensive Frontend Security Utility
 * Mitigates: CWE-79 (XSS), CWE-20 (Improper Input Validation), CWE-116 (Output Encoding)
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize HTML content to prevent XSS
 */
export const sanitizeHTML = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br', 'ul', 'ol', 'li', 'span'],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
  });
};

/**
 * Sanitize user input strings to prevent common injection characters
 */
export const sanitizeString = (input: string): string => {
  if (!input) return '';
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .trim();
};

/**
 * Validate and sanitize URL to prevent SSRF and XSS in hrefs
 */
export const sanitizeURL = (url: string): string => {
  if (!url) return '';
  try {
    const parsed = new URL(url, window.location.origin);
    if (!['http:', 'https:'].includes(parsed.protocol)) return '';
    return parsed.toString();
  } catch {
    return '';
  }
};

/**
 * Deep sanitize an object or array
 */
export const sanitizeDeep = (data: any): any => {
  if (typeof data === 'string') return sanitizeString(data);
  if (Array.isArray(data)) return data.map(item => sanitizeDeep(item));
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const key in data) {
      sanitized[key] = sanitizeDeep(data[key]);
    }
    return sanitized;
  }
  return data;
};

/**
 * Safely parse JSON from untrusted sources (CWE-502)
 */
export const safeJSONParse = <T>(json: string, fallback: T): T => {
  try {
    const parsed = JSON.parse(json);
    // Add additional validation here if specific schema is expected
    return parsed as T;
  } catch (e) {
    console.warn('Safe JSON Parse failed:', e);
    return fallback;
  }
};

/**
 * Prevent timing attacks for simple comparisons (CWE-208)
 * (Note: Real constant-time comparison is hard in JS, this is a basic attempt)
 */
export const safeCompare = (a: string, b: string): boolean => {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
};
