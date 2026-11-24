"use client";

import { useState, useTransition } from "react";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { askFaqChatbotAction } from "@/features/ia/actions";
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

/** Widget flottant de chatbot FAQ pour accompagner les étudiants. */
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

  function sendQuestion(question: string) {
    const trimmed = question.trim();
    if (!trimmed || isPending) return;

    setMessages((prev) => [...prev, { role: "user", text: trimmed }]);
    setInput("");

    startTransition(async () => {
      const response = await askFaqChatbotAction(trimmed);
      setMessages((prev) => [...prev, { role: "bot", text: response.answer }]);
    });
  }

  return (
    <div className="fixed right-4 bottom-20 z-40 md:right-6 md:bottom-6">
      {open ? (
        <div className="flex h-[420px] w-[340px] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-lg sm:w-[370px]">
          <div className="flex items-center justify-between bg-brand px-4 py-3 text-brand-foreground">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-4 w-4" />
              <span className="text-sm font-semibold">Assistant FAQ</span>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fermer l'assistant"
              className="rounded-lg p-1 hover:bg-white/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto p-4 text-sm">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed",
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

          <div className="flex flex-wrap gap-1.5 border-t border-border/60 px-3 py-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => sendQuestion(s)}
                className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-medium text-accent-foreground hover:bg-accent/80"
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
            className="flex items-center gap-2 border-t border-border p-3"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question..."
              className="h-9 rounded-xl text-xs"
            />
            <Button
              type="submit"
              size="icon"
              disabled={isPending || !input.trim()}
              aria-label="Envoyer"
              className="h-9 w-9 shrink-0 rounded-xl bg-brand text-brand-foreground hover:bg-brand-dark"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setOpen(true)}
          className="h-12 rounded-full bg-brand px-4 text-sm font-semibold text-brand-foreground shadow-md hover:bg-brand-dark"
        >
          <MessageCircle className="mr-2 h-4 w-4" />
          Aide FAQ
        </Button>
      )}
    </div>
  );
}
