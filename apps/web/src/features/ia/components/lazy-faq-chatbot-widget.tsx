"use client";

import dynamic from "next/dynamic";

const FaqChatbotWidget = dynamic(
  () => import("./faq-chatbot-widget").then((mod) => mod.FaqChatbotWidget),
  { ssr: false }
);

/** Charge le widget FAQ IA à la demande côté client. */
export function LazyFaqChatbotWidget() {
  return <FaqChatbotWidget />;
}
