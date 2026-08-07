import {
  HeaderSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={8} columns={6} withTabs />
    </>
  );
}
