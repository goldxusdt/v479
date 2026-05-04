import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders, detectSQLi, detectXSS, detectPathTraversal } from '../_shared/security.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const clientIp = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const clientCountry = req.headers.get('x-vercel-ip-country') || 'Unknown';
    const clientUserAgent = req.headers.get('user-agent') || 'Unknown';
    const { endpoint, method, body, query } = await req.json();

    // Log the request to security_events
    await supabaseClient.from('security_events').insert({
      event_type: 'api_request',
      severity: 'low',
      description: `Request to ${endpoint}`,
      ip_address: clientIp,
      metadata: { country: clientCountry, endpoint, method, user_agent: clientUserAgent }
    });

    // 1. Check IP Blocks and Whitelists
    const { data: rules, error: rulesError } = await supabaseClient
      .from('firewall_rules')
      .select('*')
      .eq('is_active', true);

    if (rulesError) throw rulesError;

    // IP Whitelist check (overrides blocks)
    const whitelisted = rules.find(r => r.type === 'ip_whitelist' && r.value === clientIp);
    if (whitelisted) {
       return new Response(JSON.stringify({ allowed: true, reason: 'Whitelisted' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // IP Block check
    const blockedIp = rules.find(r => r.type === 'ip_block' && r.value === clientIp);
    if (blockedIp) {
       await supabaseClient.rpc('log_security_event', {
         p_event_type: 'waf_block',
         p_severity: 'high',
         p_description: `IP ${clientIp} blocked by WAF rule ${blockedIp.id}`,
         p_ip_address: clientIp,
         p_metadata: { country: clientCountry, endpoint, method }
       });
       return new Response(JSON.stringify({ allowed: false, reason: 'IP Blocked' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // Geo Block check
    const blockedGeo = rules.find(r => r.type === 'geo_block' && r.value === clientCountry);
    if (blockedGeo) {
       await supabaseClient.rpc('log_security_event', {
         p_event_type: 'waf_block',
         p_severity: 'high',
         p_description: `Country ${clientCountry} blocked by WAF rule ${blockedGeo.id}`,
         p_ip_address: clientIp,
         p_metadata: { country: clientCountry, endpoint, method }
       });
       return new Response(JSON.stringify({ allowed: false, reason: 'Geographic restriction' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // 2. Attack Detection (SQLi, XSS, Path Traversal)
    const requestData = JSON.stringify({ body, query });
    let attackDetected = false;
    let attackType = '';

    if (detectSQLi(requestData)) {
       attackDetected = true;
       attackType = 'SQL Injection';
    } else if (detectXSS(requestData)) {
       attackDetected = true;
       attackType = 'XSS';
    } else if (detectPathTraversal(requestData)) {
       attackDetected = true;
       attackType = 'Path Traversal';
    }

    if (attackDetected) {
       await supabaseClient.rpc('log_security_event', {
         p_event_type: 'attack_blocked',
         p_severity: 'critical',
         p_description: `${attackType} attempt detected from IP ${clientIp} on endpoint ${endpoint}`,
         p_ip_address: clientIp,
         p_metadata: { country: clientCountry, endpoint, method, attack_type: attackType, payload: requestData }
       });
       return new Response(JSON.stringify({ allowed: false, reason: 'Malicious activity detected' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 });
    }

    // 3. Rate Limiting check
    const rateLimitRule = rules.find(r => 
      r.type === 'rate_limit' && 
      (r.target_endpoint === endpoint || r.target_endpoint === 'ALL')
    );

    if (rateLimitRule) {
      const windowStart = new Date(Date.now() - (rateLimitRule.rate_limit_window * 1000)).toISOString();
      const { count, error: countError } = await supabaseClient
        .from('security_events')
        .select('*', { count: 'exact', head: true })
        .eq('ip_address', clientIp)
        .eq('event_type', 'api_request')
        .eq('metadata->>endpoint', endpoint)
        .gte('created_at', windowStart);

      if (countError) throw countError;

      if (count && count >= rateLimitRule.rate_limit_max) {
         await supabaseClient.rpc('log_security_event', {
           p_event_type: 'rate_limit_exceeded',
           p_severity: 'medium',
           p_description: `Rate limit exceeded for IP ${clientIp} on endpoint ${endpoint}`,
           p_ip_address: clientIp,
           p_metadata: { country: clientCountry, endpoint, method, limit: rateLimitRule.rate_limit_max }
         });
         return new Response(JSON.stringify({ allowed: false, reason: 'Rate limit exceeded' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 429 });
      }
    }

    return new Response(JSON.stringify({ allowed: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 });
  }
})
