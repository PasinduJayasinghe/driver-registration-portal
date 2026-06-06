"use client";

import { useState } from "react";
import PayrollFormModal from "@/components/admin/PayrollFormModal";

export default function AddPayrollButton({ employees }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Payroll Record
      </button>
      <PayrollFormModal
        key="add-header"
        open={open}
        onClose={() => setOpen(false)}
        employees={employees}
        record={null}
      />
    </>
  );
}
