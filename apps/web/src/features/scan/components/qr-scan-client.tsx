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

/** Interface agent : scan caméra mobile/desktop + saisie manuelle en secours. */
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

  if (result) {
    return <VerificationResultCard result={result} onScanAnother={handleReset} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      {/* Scanner caméra */}
      <Card className="rounded-2xl border-border/80 bg-surface shadow-none lg:col-span-7">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <QrCode className="h-4 w-4 text-brand" />
            Scanner avec la caméra
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-black/5">
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
              components={{ torch: true, finder: true }}
            />
          </div>

          {cameraError && (
            <p className="text-xs text-muted-foreground">{cameraError}</p>
          )}
        </CardContent>
      </Card>

      {/* Saisie manuelle en secours */}
      <Card className="rounded-2xl border-border/80 bg-surface shadow-none lg:col-span-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">
            Saisie manuelle (secours)
          </CardTitle>
        </CardHeader>
        <CardContent>
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
              className="h-11 w-full rounded-xl bg-brand text-sm font-semibold text-brand-foreground hover:bg-brand-dark"
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
  );
}
