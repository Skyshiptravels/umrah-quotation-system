export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Sends email via Resend HTTP API when RESEND_API_KEY is set.
 * Otherwise logs to console (development / staging without mail provider).
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM || "noreply@skyshiptravels.com";

  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[email] (not sent — RESEND_API_KEY unset)", {
        to: options.to,
        subject: options.subject,
      });
    }
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed: ${res.status} ${body}`);
  }
}
