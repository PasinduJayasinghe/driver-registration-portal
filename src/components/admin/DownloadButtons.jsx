"use client";

export default function DownloadButtons({ csvHref, pdfHref }) {
  return (
    <div className="flex items-center gap-2">
      <a
        href={csvHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-outline text-on-surface-variant text-label-md font-semibold tracking-[0.05em] hover:bg-surface-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">table_view</span>
        Download CSV
      </a>
      <a
        href={pdfHref}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">picture_as_pdf</span>
        Download PDF
      </a>
    </div>
  );
}
