import { HeaderSkeleton, TableSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <>
      <HeaderSkeleton />
      {/* Placeholder for the clock in/out control. */}
      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 p-8 flex flex-col items-center gap-4">
        <div className="h-32 w-32 rounded-full bg-surface-container-high/70 animate-pulse" />
        <div className="h-4 w-40 rounded-md bg-surface-container-high/70 animate-pulse" />
      </div>
      <TableSkeleton rows={5} columns={4} />
    </>
  );
}
