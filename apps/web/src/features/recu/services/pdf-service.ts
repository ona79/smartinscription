import {
  PAYMENT_METHOD_LABELS_FR,
  type PaymentMethod,
} from "@smartinscription/shared";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import QRCode from "qrcode";
import { buildVerificationUrl } from "./receipt-service";

export interface ReceiptPdfInput {
  receiptNumber: string;
  providerRef: string;
  qrToken: string;
  paidAt: Date;
  montant: number;
  moyen: PaymentMethod;
  studentName: string;
  numeroEtudiant: string;
  ufrNom: string;
  filiereNom: string;
  niveau: string;
  anneeAcademique: string;
}

/** Remplace les espaces insécables (U+202F, U+00A0) par des espaces ASCII pour WinAnsi. */
function toWinAnsiSafe(text: string): string {
  return text.replace(/[\u202f\u00a0]/g, " ");
}

/** Génère le reçu officiel au format PDF côté serveur avec QR code intégré. */
export async function generateReceiptPdfBuffer(
  input: ReceiptPdfInput
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const brandColor = rgb(0.059, 0.463, 0.431); // #0f766e
  const darkText = rgb(0.059, 0.09, 0.165); // #0f172a
  const mutedText = rgb(0.392, 0.455, 0.545); // #64748b
  const lightBg = rgb(0.941, 0.992, 0.98); // #f0fdfa
  const borderColor = rgb(0.886, 0.91, 0.941); // #e2e8f0

  // Bandeau d'en-tête
  page.drawRectangle({
    x: 0,
    y: height - 110,
    width,
    height: 110,
    color: brandColor,
  });

  page.drawText("SmartInscription IA", {
    x: 48,
    y: height - 52,
    size: 22,
    font: fontBold,
    color: rgb(1, 1, 1),
  });

  page.drawText("Reçu numérique officiel d'inscription universitaire", {
    x: 48,
    y: height - 76,
    size: 11,
    font: fontRegular,
    color: rgb(0.85, 0.97, 0.95),
  });

  // Numéro de reçu et date
  page.drawRectangle({
    x: 48,
    y: height - 185,
    width: width - 96,
    height: 56,
    color: lightBg,
    borderColor,
    borderWidth: 1,
  });

  page.drawText(toWinAnsiSafe(`Reçu N° : ${input.receiptNumber}`), {
    x: 64,
    y: height - 156,
    size: 13,
    font: fontBold,
    color: brandColor,
  });

  const formattedDate = toWinAnsiSafe(
    input.paidAt.toLocaleString("fr-FR", {
      dateStyle: "long",
      timeStyle: "short",
    })
  );
  page.drawText(`Date de paiement : ${formattedDate}`, {
    x: 64,
    y: height - 174,
    size: 10,
    font: fontRegular,
    color: darkText,
  });

  // Informations de l'étudiant et du paiement
  const rows: [string, string][] = [
    ["Étudiant", input.studentName],
    ["Numéro étudiant", input.numeroEtudiant],
    ["Année académique", input.anneeAcademique],
    ["UFR", input.ufrNom],
    ["Filière", input.filiereNom],
    ["Niveau", input.niveau],
    ["Montant réglé", toWinAnsiSafe(`${input.montant.toLocaleString("fr-FR")} FCFA`)],
    ["Moyen de paiement", PAYMENT_METHOD_LABELS_FR[input.moyen]],
    ["Référence transaction", input.providerRef],
    ["Statut", "PAYÉ"],
  ];

  let cursorY = height - 230;
  for (const [label, value] of rows) {
    page.drawText(toWinAnsiSafe(label), {
      x: 48,
      y: cursorY,
      size: 10,
      font: fontRegular,
      color: mutedText,
    });
    page.drawText(toWinAnsiSafe(value), {
      x: 220,
      y: cursorY,
      size: 11,
      font: fontBold,
      color: darkText,
    });
    page.drawLine({
      start: { x: 48, y: cursorY - 10 },
      end: { x: width - 48, y: cursorY - 10 },
      thickness: 0.5,
      color: borderColor,
    });
    cursorY -= 32;
  }

  // QR Code de vérification
  const verificationUrl = buildVerificationUrl(input.qrToken);
  const qrBuffer = await QRCode.toBuffer(verificationUrl, {
    type: "png",
    width: 180,
    margin: 1,
  });
  const qrImage = await pdfDoc.embedPng(qrBuffer);

  const qrSize = 130;
  const qrX = 48;
  const qrY = 90;

  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });

  page.drawText("Vérification par scan QR", {
    x: qrX + qrSize + 24,
    y: qrY + 86,
    size: 12,
    font: fontBold,
    color: darkText,
  });

  page.drawText(
    "Présentez ce reçu (version numérique ou imprimée) à un agent\n" +
      "de scolarité pour valider votre inscription universitaire.\n" +
      "Ce QR code ne contient aucune donnée personnelle.",
    {
      x: qrX + qrSize + 24,
      y: qrY + 62,
      size: 9.5,
      lineHeight: 14,
      font: fontRegular,
      color: mutedText,
    }
  );

  return pdfDoc.save();
}
