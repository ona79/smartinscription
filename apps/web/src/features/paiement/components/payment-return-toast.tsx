"use client";

import { useEffect, useRef } from "react";
import { notifyActionResult } from "@/hooks/use-action-toast";
import { MESSAGES } from "@/lib/messages";

interface PaymentReturnToastProps {
  status: "success" | "failed" | "cancelled" | "pending";
}

export function PaymentReturnToast({ status }: PaymentReturnToastProps) {
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    if (status === "success") {
      notifyActionResult({ ok: true, message: MESSAGES.payment.success });
    } else if (status === "failed") {
      notifyActionResult({ ok: false, error: MESSAGES.payment.failed });
    } else if (status === "cancelled") {
      notifyActionResult({ ok: false, error: MESSAGES.payment.cancelled });
    } else {
      notifyActionResult({ ok: true, message: MESSAGES.payment.pending });
    }
  }, [status]);

  return null;
}
