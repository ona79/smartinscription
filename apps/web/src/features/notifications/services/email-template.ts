/**
 * Gabarit HTML responsive (largeur max 600 px, boutons 44 px) + version texte brute
 * pour les e-mails de notification SmartInscription IA.
 */
export function buildNotificationEmail(params: {
  prenom: string;
  title: string;
  bodyHtml: string;
  bodyText: string;
  ctaLabel?: string;
  ctaHref?: string;
}): { html: string; text: string } {
  const appUrl = (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://smartinscription-apps.vercel.app"
  ).replace(/\/$/, "");
  const ctaUrl = params.ctaHref
    ? params.ctaHref.startsWith("http")
      ? params.ctaHref
      : `${appUrl}${params.ctaHref}`
    : `${appUrl}/etudiant`;
  const ctaLabel = params.ctaLabel ?? "Ouvrir mon espace";

  const html = `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>${params.title}</title>
  </head>
  <body style="margin:0;padding:0;background-color:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
            <tr>
              <td style="background-color:#0f766e;padding:18px 24px;color:#ffffff;font-size:16px;font-weight:600;">
                SmartInscription IA — Portail universitaire
              </td>
            </tr>
            <tr>
              <td style="padding:24px;font-size:15px;line-height:1.55;color:#0f172a;">
                <p style="margin:0 0 12px;">Bonjour ${params.prenom},</p>
                <div style="margin:0 0 20px;">${params.bodyHtml}</div>
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="border-radius:8px;background-color:#0f766e;">
                      <a href="${ctaUrl}" style="display:inline-block;min-height:44px;line-height:44px;padding:0 20px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;">
                        ${ctaLabel}
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:14px 24px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;">
                SmartInscription IA · Université Assane Seck de Ziguinchor
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `Bonjour ${params.prenom},\n\n${params.bodyText}\n\n${ctaLabel} : ${ctaUrl}\n\nSmartInscription IA`;

  return { html, text };
}
