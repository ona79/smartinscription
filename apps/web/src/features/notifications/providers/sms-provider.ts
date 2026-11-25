export interface SendSmsInput {
  to: string;
  message: string;
}

export interface SendSmsResult {
  sent: boolean;
  provider: string;
  messageId?: string;
}

/**
 * Interface de fournisseur SMS (perspective future : Orange SMS API / Twilio).
 * Aucun envoi SMS réel n'est effectué dans ce périmètre.
 */
export interface SmsProvider {
  readonly name: string;
  sendSms(input: SendSmsInput): Promise<SendSmsResult>;
}

/** Implémentation simulée du fournisseur SMS pour le développement et les tests. */
export class MockSmsProvider implements SmsProvider {
  readonly name = "mock-sms";

  async sendSms(input: SendSmsInput): Promise<SendSmsResult> {
    console.info(`[sms:mock] Envoi simulé longueur=${input.message.length}`);
    return {
      sent: true,
      provider: this.name,
      messageId: `mock-sms-${Date.now()}`,
    };
  }
}
