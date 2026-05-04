import { writeAll } from "https://deno.land/std@0.208.0/streams/write_all.ts";

// Polyfill Deno.writeAll for compatibility with the smtp library in newer Deno runtimes
if (typeof (Deno as any).writeAll !== "function") {
  (Deno as any).writeAll = writeAll;
}

import { SmtpClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail({ to, subject, html, from }: SendEmailOptions) {
  // Use environment variables directly (Supabase Secrets)
  const username = Deno.env.get("SMTP_USER");
  const password = Deno.env.get("SMTP_PASS");
  const host = Deno.env.get("SMTP_HOST") || "smtp.hostinger.com";
  const port = parseInt(Deno.env.get("SMTP_PORT") || "465"); 
  const fromEmail = Deno.env.get("SMTP_FROM_EMAIL") || username;
  const fromName = Deno.env.get("SMTP_FROM_NAME") || "Gold X Usdt";

  if (!username || !password) {
    console.error("SMTP Configuration Missing in environment variables");
    throw new Error("network error sending email SMTP credential not configure please set then in admin settings");
  }

  const client = new SmtpClient();

  try {
    console.log(`Connecting to SMTP: ${host}:${port} as ${username}`);
    
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

    const fromAddress = from || (fromEmail ? `${fromName} <${fromEmail}>` : username);

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
    try { await client.close(); } catch (e) { /* ignore */ }
    throw error;
  }
}
