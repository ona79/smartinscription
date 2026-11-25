import {
  PAYMENT_METHOD_LABELS_FR,
  type PaymentMethod,
} from "@smartinscription/shared";
import { CheckCircle2, Download, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ReceiptCardProps {
  paymentId: string;
  receiptNumber: string;
  providerRef: string;
  montant: number;
  moyen: PaymentMethod;
  paidAt: Date;
  qrDataUrl: string;
  studentName: string;
  numeroEtudiant: string;
}

/** Carte compacte « Mon reçu » affichant l'aperçu du QR code (168 px) et le téléchargement PDF. */
export function ReceiptCard({
  paymentId,
  receiptNumber,
  providerRef,
  montant,
  moyen,
  paidAt,
  qrDataUrl,
  studentName,
  numeroEtudiant,
}: ReceiptCardProps) {
  return (
    <Card className="rounded-xl border border-border bg-surface py-0 shadow-xs">
      <CardContent className="grid gap-6 p-5 md:grid-cols-12 md:items-center">
        {/* Informations du reçu */}
        <div className="space-y-4 md:col-span-7">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="h-[18px] w-[18px]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground">Mon reçu numérique</h2>
              <p className="font-mono text-xs text-muted-foreground">{receiptNumber}</p>
            </div>
            <Badge className="ml-auto rounded-full bg-success px-2.5 py-0.5 text-xs font-medium text-white">
              Payé
            </Badge>
          </div>

          <dl className="grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3.5 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Étudiant</dt>
              <dd className="mt-0.5 font-medium text-foreground">{studentName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">N° étudiant</dt>
              <dd className="mt-0.5 font-mono font-medium text-foreground">
                {numeroEtudiant}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Montant</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {montant.toLocaleString("fr-FR")} FCFA
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Moyen</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {PAYMENT_METHOD_LABELS_FR[moyen]}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Date</dt>
              <dd className="mt-0.5 font-medium text-foreground">
                {paidAt.toLocaleDateString("fr-FR")}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Référence</dt>
              <dd className="mt-0.5 truncate font-mono text-xs text-foreground">
                {providerRef}
              </dd>
            </div>
          </dl>

          <a
            href={`/api/recu/${paymentId}/pdf`}
            className={cn(
              buttonVariants({ size: "default" }),
              "h-10 w-full rounded-lg bg-brand px-4 text-sm font-medium text-brand-foreground hover:bg-brand-dark sm:w-auto"
            )}
          >
            <Download className="mr-2 h-4 w-4" />
            Télécharger le reçu PDF
          </a>
        </div>

        {/* Aperçu QR code 168 px */}
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/20 p-5 text-center md:col-span-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={qrDataUrl}
            alt={`QR code de vérification du reçu ${receiptNumber}`}
            className="h-[168px] w-[168px] rounded-lg border border-border bg-white p-1.5"
          />
          <div className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <QrCode className="h-3.5 w-3.5 text-brand" />
            <span>QR code de vérification</span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            À présenter à un agent de scolarité.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
