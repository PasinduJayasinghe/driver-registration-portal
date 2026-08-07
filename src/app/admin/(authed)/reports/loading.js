import {
  HeaderSkeleton,
  FiltersSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

// Reports is the heaviest page — a month of entries plus a day-by-day matrix.
// It benefits most from painting a shell immediately.
export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <FiltersSkeleton fields={3} />
      <TableSkeleton rows={6} columns={5} />
      <TableSkeleton rows={10} columns={5} />
    </>
  );
}
