import {
  HeaderSkeleton,
  StatCardsSkeleton,
  TableSkeleton,
} from "@/components/ui/Skeleton";

// Fallback for the admin overview. Nested routes with their own loading.js
// override this; the rest inherit it.
export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <TableSkeleton rows={5} columns={4} />
    </>
  );
}
