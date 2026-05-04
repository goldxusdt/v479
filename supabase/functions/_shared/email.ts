import { writeAll } from "https://deno.land/std@0.208.0/streams/write_all.ts";

// Polyfill Deno.writeAll for compatibility with the smtp library in newer Deno runtimes
if (typeof (Deno as any).writeAll !== "function") {
  (Deno as any).writeAll = writeAll;
}

import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  // 1. Try to get from Environment first (Supabase Secrets)
  let username = Deno.env.get("SMTP_USER");
  let password = Deno.env.get("SMTP_PASS");
  let host = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
  let port = parseInt(Deno.env.get("SMTP_PORT") || "465"); 

  // 2. If not in Env, try to get from Database settings table
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  const { data: dbSettings } = await supabase
    .from('settings')
    .select('key, value')
    .in('key', ['smtp_user', 'smtp_pass', 'smtp_host', 'smtp_port', 'site_title']);
  
  let siteTitle = "Gold X Usdt";
  dbSettings?.forEach(s => {
    if (s.key === 'smtp_user' && s.value) username = s.value;
    if (s.key === 'smtp_pass' && s.value) password = s.value;
    if (s.key === 'smtp_host' && s.value) host = s.value;
    if (s.key === 'smtp_port' && s.value) port = parseInt(s.value);
    if (s.key === 'site_title' && s.value) siteTitle = s.value;
  });

  if (!username || !password) {
    console.error("SMTP Configuration Missing:", { hasUser: !!username, hasPass: !!password });
    throw new Error("network error sending email SMTP credential not configure please set then in admin settings");
  }

  const client = new SmtpClient();

  try {
    console.log(`Connecting to SMTP: ${host}:${port} as ${username}`);
    
    // Zoho Port 465 requires connectTLS (SSL)
    // Zoho Port 587 requires connect (STARTTLS)
    if (port === 465) {
      await client.connectTLS({
        hostname: host,
        port: port,
        username: username,
        password: password,
      });
    } else {
      await client.connect({
        hostname: host,
        port: port,
        username: username,
        password: password,
      });
    }

    // Determine the "from" address. 
    // Hostinger/Zoho often require the 'from' email to match the authenticated 'username'
    let fromAddress = from || username;
    if (!fromAddress.includes('<')) {
      fromAddress = `${siteTitle} <${username}>`;
    }

    console.log(`Sending email from: ${fromAddress} to: ${to}`);

    await client.send({
      from: fromAddress,
      to: to,
      subject: subject,
      content: html,
      html: html,
    });

    await client.close();
    console.log(`Email sent successfully to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Failed to send email via SMTP:", error);
    // Explicitly try to close to avoid leaking connections
    try { await client.close(); } catch (e) { /* ignore close errors */ }
    
    // Check for common Zoho/Deno issues
    if (error.message?.includes('readSliced')) {
      throw new Error(`SMTP Protocol Error: This often happens with Port/TLS mismatch. Try Port 465 for SSL or 587 for STARTTLS. (${error.message})`);
    }
    
    throw error;
  }
}
