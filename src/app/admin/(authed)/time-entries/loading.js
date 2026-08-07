import { HeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <TableSkeleton rows={10} columns={6} withTabs />
    </>
  );
}
