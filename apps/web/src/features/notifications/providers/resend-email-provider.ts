import type { EmailProvider, SendEmailInput, SendEmailResult } from "./types";

/** Fournisseur d'e-mails réel via l'API HTTP Resend. */
export class ResendEmailProvider implements EmailProvider {
  readonly name = "resend";

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail =
      process.env.RESEND_FROM_EMAIL || "SmartInscription IA <onboarding@resend.dev>";

    if (!apiKey) {
      throw new Error("RESEND_API_KEY manquante pour ResendEmailProvider.");
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as { id?: string; message?: string };

    if (!response.ok) {
      console.warn(`[email:resend] Échec envoi: ${data.message ?? response.status}`);
      return { sent: false, provider: this.name };
    }

    return {
      sent: true,
      provider: this.name,
      messageId: data.id,
    };
  }
}
