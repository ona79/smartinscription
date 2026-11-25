"use client";

import { useEffect, useState, useTransition } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askFaqChatbotAction } from "@/features/ia/actions";
import { MESSAGES } from "@/lib/messages";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "bot";
  text: string;
}

const SUGGESTIONS = [
  "Quel est le montant des frais ?",
  "Quels documents déposer ?",
  "Comment prendre rendez-vous ?",
];

/**
 * Widget FAQ :
 * - sur mobile (< 768 px) : aucun bouton flottant (ouvert depuis l'icône d'aide de l'en-tête)
 *   et panneau en feuille plein écran compatible clavier ;
 * - sur desktop (≥ 768 px) : bouton flottant en bas à droite.
 */
export function FaqChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "bot",
      text: "Bonjour ! Je suis l'assistant SmartInscription. Posez-moi vos questions sur les frais, paiements, documents ou rendez-vous.",
    },
  ]);

  useEffect(() => {
    function handleOpenEvent() {
      setOpen(true);
    }
    window.addEventListener("smartinscription:open-faq", handleOpenEvent);
    return () => window.removeEventListener("smartinscription:open-faq", handleOpenEvent);
  }, []);

  function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isPending) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    startTransition(async () => {
      try {
        const response = await askFaqChatbotAction(trimmed);
        setMessages((prev) => [
          ...prev,
          { role: "bot", text: response.answer ?? MESSAGES.ia.unavailable },
        ]);
      } catch {
        setMessages((prev) => [...prev, { role: "bot", text: MESSAGES.ia.unavailable }]);
      }
    });
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Assistant FAQ"
          className="fixed inset-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden bg-surface pb-[env(safe-area-inset-bottom)] md:inset-auto md:right-6 md:bottom-6 md:h-[440px] md:w-[370px] md:rounded-2xl md:border md:border-border md:pb-0 md:shadow-lg"
        >
          <div className="flex h-[52px] shrink-0 items-center justify-between bg-brand px-4 text-brand-foreground md:h-auto md:py-3">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Assistant FAQ</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer l'assistant"
              className="inline-flex size-10 items-center justify-center rounded-lg hover:bg-white/15 md:size-8"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed md:text-xs",
                  msg.role === "user"
                    ? "ml-auto bg-brand text-brand-foreground"
                    : "bg-muted text-foreground"
                )}
              >
                {msg.text}
              </div>
            ))}
            {isPending && (
              <div className="inline-flex items-center gap-1.5 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Réflexion...
              </div>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-1.5 border-t border-border/60 px-3 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendQuestion(s)}
                className="min-h-9 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground hover:bg-accent/80 md:min-h-0 md:px-2.5 md:text-[11px]"
              >
                {s}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendQuestion(input);
            }}
            className="flex shrink-0 items-center gap-2 border-t border-border p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="rounded-xl"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isPending || !input.trim()}
              aria-label="Envoyer"
              className="shrink-0 rounded-xl bg-brand text-brand-foreground hover:bg-brand-dark"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Bouton flottant uniquement sur écrans larges (desktop) */}
      {!open && (
        <div className="fixed right-6 bottom-6 z-40 hidden md:block">
          <Button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Aide FAQ"
            title="Aide FAQ"
            className="group h-11 rounded-full bg-brand px-4 text-sm font-medium text-brand-foreground shadow-md transition-all hover:bg-brand-dark"
          >
            <MessageCircle className="h-4 w-4 shrink-0" />
            <span className="ml-2">Aide FAQ</span>
          </Button>
        </div>
      )}
    </>
  );
}
