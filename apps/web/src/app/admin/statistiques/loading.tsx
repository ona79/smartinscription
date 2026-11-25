import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton statsCount={2} rowsCount={5} />;
}
