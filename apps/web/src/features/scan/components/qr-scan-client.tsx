"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Camera, ChevronDown, KeyRound, Loader2, QrCode, Search } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { verifyQrCodeAction } from "@/features/scan/actions";
import { VerificationResultCard } from "@/features/scan/components/verification-result-card";
import type { VerificationResult } from "@/features/scan/services/verification-service";
import { notifyActionResult } from "@/hooks/use-action-toast";
import { MESSAGES } from "@/lib/messages";

const QrCameraScanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((mod) => mod.Scanner),
  { ssr: false }
);

/**
 * Interface agent de scan QR :
 * - sur mobile : caméra portrait (≤ 58 dvh), bouton de lancement bien visible, lampe torche intégrée,
 *   saisie manuelle repliable, résultat affiché dans une feuille du bas ;
 * - sur desktop : caméra + saisie manuelle côte à côte et résultat dessous.
 */
export function QrScanClient() {
  const router = useRouter();
  const [cameraActive, setCameraActive] = useState(true);
  const [manualOpen, setManualOpen] = useState(false);
  const [manualToken, setManualToken] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleVerify(rawValue: string) {
    if (!rawValue.trim() || isPending) return;
    startTransition(async () => {
      try {
        const response = await verifyQrCodeAction(rawValue);
        if (response.kind === "card") {
          if (response.valid) {
            notifyActionResult({ ok: true, message: MESSAGES.scan.valid });
            router.push(response.redirectUrl);
            return;
          }
          setResult({ valid: false, error: response.error });
          notifyActionResult({ ok: false, error: response.error });
          return;
        }

        setResult(response);
        if (response.valid) {
          notifyActionResult({ ok: true, message: MESSAGES.scan.valid });
        } else {
          notifyActionResult({
            ok: false,
            error: response.error || MESSAGES.scan.invalid,
          });
        }
      } catch {
        notifyActionResult({ ok: false, error: MESSAGES.generic.network });
      }
    });
  }

  function handleReset() {
    setResult(null);
    setManualToken("");
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Scanner caméra */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs lg:col-span-7">
          <CardHeader className="flex flex-row items-center justify-between gap-2 p-4 pb-2 sm:p-5 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <QrCode className="h-[18px] w-[18px] text-brand" />
              Scanner avec la caméra
            </CardTitle>
            <Button
              type="button"
              variant={cameraActive ? "outline" : "default"}
              size="sm"
              onClick={() => {
                setCameraError(null);
                setCameraActive((prev) => !prev);
              }}
              className="rounded-lg text-xs"
            >
              <Camera className="mr-1.5 h-3.5 w-3.5" />
              {cameraActive ? "Mettre en pause" : "Activer la caméra"}
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 p-4 pt-0 sm:p-5 sm:pt-0">
            {cameraActive ? (
              <div className="relative mx-auto aspect-[3/4] max-h-[56dvh] w-full max-w-md overflow-hidden rounded-xl border border-border bg-black/5 sm:aspect-square sm:max-h-[400px]">
                <QrCameraScanner
                  onScan={(detected) => {
                    const raw = detected[0]?.rawValue;
                    if (raw) {
                      handleVerify(raw);
                    }
                  }}
                  onError={() => {
                    setCameraError(MESSAGES.scan.cameraDenied);
                  }}
                  constraints={{ facingMode: "environment" }}
                  components={{ torch: true, finder: false }}
                  styles={{
                    container: { width: "100%", height: "100%" },
                    video: { width: "100%", height: "100%", objectFit: "cover" },
                  }}
                />
                {/* Cadre de visée */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-0 flex items-center justify-center"
                >
                  <div className="h-44 w-44 rounded-xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.28)] ring-2 ring-brand/60" />
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-6 text-center">
                <QrCode className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  La caméra est en pause.
                </p>
                <Button
                  type="button"
                  onClick={() => {
                    setCameraError(null);
                    setCameraActive(true);
                  }}
                  className="h-12 w-full rounded-lg bg-brand text-sm font-semibold text-brand-foreground hover:bg-brand-dark sm:h-10 sm:w-auto sm:px-5"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Lancer le scanner QR
                </Button>
              </div>
            )}

            {cameraError && (
              <p role="alert" className="text-center text-xs font-medium text-destructive">
                {cameraError}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Saisie manuelle : repliable sur mobile, ouverte sur desktop */}
        <Card className="min-w-0 rounded-xl border border-border bg-surface py-0 shadow-xs lg:col-span-5">
          <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-3">
            <button
              type="button"
              onClick={() => setManualOpen((o) => !o)}
              aria-expanded={manualOpen}
              className="flex w-full items-center justify-between text-left lg:pointer-events-none"
            >
              <CardTitle className="text-base font-semibold">
                Saisie manuelle (secours)
              </CardTitle>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform lg:hidden ${
                  manualOpen ? "rotate-180" : ""
                }`}
              />
            </button>
          </CardHeader>
          <CardContent
            className={`${manualOpen ? "block" : "hidden"} p-4 pt-0 sm:p-5 sm:pt-0 lg:block`}
          >
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
                className="w-full rounded-lg bg-brand text-sm font-medium text-brand-foreground hover:bg-brand-dark"
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

      {/* Desktop : résultat affiché sous les deux blocs */}
      {result && (
        <div className="hidden lg:block">
          <VerificationResultCard result={result} onScanAnother={handleReset} />
        </div>
      )}

      {/* Mobile / Tablette : résultat dans une feuille du bas */}
      <Dialog open={Boolean(result)} onOpenChange={(open) => !open && handleReset()}>
        <DialogContent className="p-4 lg:hidden">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              Résultat de la vérification
            </DialogTitle>
          </DialogHeader>
          {result && <VerificationResultCard result={result} onScanAnother={handleReset} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
