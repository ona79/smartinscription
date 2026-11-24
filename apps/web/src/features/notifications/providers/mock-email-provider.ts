import type { EmailProvider, SendEmailInput, SendEmailResult } from "./types";

/** Fournisseur d'e-mails simulé pour le développement local sans clé externe. */
export class MockEmailProvider implements EmailProvider {
  readonly name = "mock";

  async sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
    console.info(`[email:mock] Envoi simulé sujet="${input.subject}"`);
    return {
      sent: true,
      provider: this.name,
      messageId: `mock-mail-${Date.now()}`,
    };
  }
}
