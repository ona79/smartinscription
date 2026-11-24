import { MockEmailProvider } from "./mock-email-provider";
import { ResendEmailProvider } from "./resend-email-provider";
import type { EmailProvider } from "./types";

/** Sélectionne le fournisseur d'e-mails selon RESEND_API_KEY. */
export function getEmailProvider(): EmailProvider {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_PROVIDER !== "mock") {
    return new ResendEmailProvider();
  }
  return new MockEmailProvider();
}
