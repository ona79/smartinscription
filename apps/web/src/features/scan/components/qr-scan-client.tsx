"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { KeyRound, Loader2, QrCode, Search } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifyQrCodeAction } from "@/features/scan/actions";
import { VerificationResultCard } from "@/features/scan/components/verification-result-card";
import type { VerificationResult } from "@/features/scan/services/verification-service";

const QrCameraScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  { ssr: false }
);

/** Interface agent : caméra (max-w-md, max-h-400px, viseur vert/blanc) + saisie manuelle + résultat dessous. */
export function QrScanClient() {
  const [manualToken, setManualToken] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVerify(rawValue: string) {
    if (!rawValue.trim() || isPending) return;
    startTransition(async () => {
      const response = await verifyQrCodeAction(rawValue);
      setResult(response);
    });
  }

  function handleReset() {
    setResult(null);
    setManualToken("");
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Scanner caméra */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs lg:col-span-7">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <QrCode className="h-[18px] w-[18px] text-brand" />
              Scanner avec la caméra
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5 p-5 pt-0">
            <div className="relative mx-auto max-h-[400px] w-full max-w-md overflow-hidden rounded-xl border border-border bg-black/5">
              <QrCameraScanner
                onScan={(detected) => {
                  const raw = detected[0]?.rawValue;
                  if (raw) {
                    handleVerify(raw);
                  }
                }}
                onError={(err) => {
                  setCameraError(
                    err instanceof Error
                      ? "Caméra indisponible ou permission refusée. Utilisez la saisie manuelle."
                      : "Impossible d'accéder à la caméra."
                  );
                }}
                constraints={{ facingMode: "environment" }}
                components={{ torch: true, finder: false }}
                styles={{
                  container: { maxHeight: "400px" },
                  video: { maxHeight: "400px", objectFit: "cover" },
                }}
              />
              {/* Cadre de visée aux couleurs de la marque (blanc/vert, sans rouge) */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 flex items-center justify-center"
              >
                <div className="h-44 w-44 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)] ring-2 ring-brand/60" />
              </div>
            </div>

            {cameraError && (
              <p className="text-center text-xs text-muted-foreground">{cameraError}</p>
            )}
          </CardContent>
        </Card>

        {/* Saisie manuelle en secours */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs lg:col-span-5">
          <CardHeader className="p-5 pb-3">
            <CardTitle className="text-base font-semibold">
              Saisie manuelle (secours)
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 pt-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(manualToken);
              }}
              className="space-y-4"
            >
              <FormField
                id="qrTokenInput"
                label="Code ou URL de vérification"
                placeholder="Collez le jeton QR ou l'URL..."
                value={manualToken}
                onChange={(e) => setManualToken(e.target.value)}
                icon={<KeyRound className="h-4 w-4" />}
                hint="Utile si la caméra est bloquée ou le reçu est abîmé."
              />

              <Button
                type="submit"
                disabled={isPending || !manualToken.trim()}
                className="h-10 w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Vérification...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Vérifier le reçu
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Résultat affiché sous les deux blocs sans pousser la caméra */}
      {result && <VerificationResultCard result={result} onScanAnother={handleReset} />}
    </div>
  );
}
