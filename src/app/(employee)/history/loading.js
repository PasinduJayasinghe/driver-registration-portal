import {
  HeaderSkeleton,
  FiltersSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <FiltersSkeleton fields={2} />
      <StatCardsSkeleton count={3} />
      <TableSkeleton rows={8} columns={5} />
    </>
  );
}
