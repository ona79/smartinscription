"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function ChartSkeleton() {
  return <Skeleton className="h-[220px] w-full rounded-lg" />;
}

export const LazyRegistrationsLineChart = dynamic(
  () => import("./admin-charts").then((m) => m.RegistrationsLineChart),
  { ssr: false, loading: ChartSkeleton }
);

export const LazyPaymentsByMethodChart = dynamic(
  () => import("./admin-charts").then((m) => m.PaymentsByMethodChart),
  { ssr: false, loading: ChartSkeleton }
);

export const LazyAffluenceByUfrChart = dynamic(
  () => import("./admin-charts").then((m) => m.AffluenceByUfrChart),
  { ssr: false, loading: ChartSkeleton }
);

export const LazyPredictionsLineChart = dynamic(
  () => import("./admin-charts").then((m) => m.PredictionsLineChart),
  { ssr: false, loading: ChartSkeleton }
);
