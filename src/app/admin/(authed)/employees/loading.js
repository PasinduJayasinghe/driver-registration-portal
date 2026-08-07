import { HeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      <TableSkeleton rows={8} columns={5} withTabs />
    </>
  );
}
