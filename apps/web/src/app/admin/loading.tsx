import { PageSkeleton } from "@/components/page-skeleton";

export default function Loading() {
  return <PageSkeleton statsCount={4} rowsCount={5} />;
}
