"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";

const registrationsConfig = {
  count: { label: "Inscriptions", color: "var(--chart-1)" },
} satisfies ChartConfig;

const paymentConfig = {
  count: { label: "Transactions", color: "var(--chart-2)" },
} satisfies ChartConfig;

const ufrConfig = {
  students: { label: "Étudiants", color: "var(--chart-1)" },
} satisfies ChartConfig;

const predictionConfig = {
  valeur: { label: "Prévision", color: "var(--chart-3)" },
} satisfies ChartConfig;

/** Courbe des inscriptions par jour. */
export function RegistrationsLineChart({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  return (
    <ChartContainer config={registrationsConfig} className="h-[220px] w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--color-count)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

/** Histogramme des paiements réussis par moyen de paiement. */
export function PaymentsByMethodChart({
  data,
}: {
  data: { method: string; count: number }[];
}) {
  return (
    <ChartContainer config={paymentConfig} className="h-[220px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="method" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="count" fill="var(--color-count)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}

/** Histogramme de l'affluence par UFR. */
export function AffluenceByUfrChart({
  data,
}: {
  data: { code: string; students: number }[];
}) {
  return (
    <ChartContainer config={ufrConfig} className="h-[220px] w-full">
      <BarChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="code" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="students" fill="var(--color-students)" radius={6} />
      </BarChart>
    </ChartContainer>
  );
}

/** Courbe des prévisions IA (par jour ou par heure). */
export function PredictionsLineChart({
  data,
}: {
  data: { label: string; valeur: number }[];
}) {
  return (
    <ChartContainer config={predictionConfig} className="h-[220px] w-full">
      <LineChart data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="valeur"
          stroke="var(--color-valeur)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ChartContainer>
  );
}
