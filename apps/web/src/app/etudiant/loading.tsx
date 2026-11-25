import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton statsCount={3} rowsCount={3} />;
}
