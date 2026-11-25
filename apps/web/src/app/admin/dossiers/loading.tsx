import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton statsCount={0} rowsCount={6} />;
}
