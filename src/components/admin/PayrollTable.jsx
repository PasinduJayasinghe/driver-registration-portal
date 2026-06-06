"use client";

import { useState, useTransition } from "react";
import PayrollFormModal from "@/components/admin/PayrollFormModal";
import { deletePayrollAction, markPayrollPaidAction } from "@/app/admin/(authed)/actions";

function formatLKR(value) {
  const n = Number(value ?? 0);
  return `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusPill({ status }) {
  if (status === "PAID") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-green-100 text-green-800 border border-green-200">
        <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
        Paid
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-amber-100 text-amber-800 border border-amber-200">
      <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
      Pending
    </span>
  );
}

function RowActions({ record, onEdit }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete payroll for ${record.driver.fullName} (${record.periodLabel})? This cannot be undone.`
    );
    if (!confirmed) return;
    const fd = new FormData();
    fd.append("id", record.id);
    startTransition(() => deletePayrollAction(fd));
  }

  function handleMarkPaid() {
    const fd = new FormData();
    fd.append("id", record.id);
    startTransition(() => markPayrollPaidAction(fd));
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {record.status === "PENDING" ? (
        <button
          type="button"
          onClick={handleMarkPaid}
          disabled={pending}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-label-sm font-semibold tracking-[0.05em] hover:bg-green-700 transition-colors disabled:opacity-60"
        >
          <span className="material-symbols-outlined text-[16px]">
            {pending ? "hourglass_top" : "payments"}
          </span>
          Mark Paid
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onEdit(record)}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline text-on-surface-variant text-label-sm font-semibold tracking-[0.05em] hover:bg-surface-container transition-colors disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[16px]">edit</span>
        Edit
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error text-on-error text-label-sm font-semibold tracking-[0.05em] hover:bg-on-error-container transition-colors disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[16px]">delete</span>
        Delete
      </button>
    </div>
  );
}

function EmptyState({ onAdd }) {
  return (
    <div className="p-12 text-center flex flex-col items-center gap-3">
      <span className="material-symbols-outlined text-[48px] text-on-surface-variant/60">
        receipt_long
      </span>
      <p className="text-on-surface-variant">
        No payroll records yet. Add the first one to get started.
      </p>
      <button
        type="button"
        onClick={onAdd}
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Add Payroll Record
      </button>
    </div>
  );
}

export default function PayrollTable({ records, employees }) {
  const [openModal, setOpenModal] = useState(false);
  const [editing, setEditing] = useState(null);

  function handleAdd() {
    setEditing(null);
    setOpenModal(true);
  }

  function handleEdit(record) {
    setEditing(record);
    setOpenModal(true);
  }

  function handleClose() {
    setOpenModal(false);
    setEditing(null);
  }

  if (records.length === 0) {
    return (
      <>
        <EmptyState onAdd={handleAdd} />
        <PayrollFormModal
          key="new"
          open={openModal}
          onClose={handleClose}
          employees={employees}
          record={editing}
        />
      </>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low border-b border-outline-variant/30">
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Employee
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Period
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Basic
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Allow.
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Deduct.
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Net
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Status
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-body-md">
            {records.map((r, idx) => (
              <tr
                key={r.id}
                className={`border-b border-outline-variant/10 hover:bg-surface-container-low/50 transition-colors ${
                  idx % 2 === 1 ? "bg-surface-bright" : ""
                }`}
              >
                <td className="py-4 px-6 text-on-surface font-medium">
                  <div>{r.driver.fullName}</div>
                  <div className="text-label-sm text-on-surface-variant font-mono">
                    {r.driver.employeeId}
                  </div>
                </td>
                <td className="py-4 px-6 text-on-surface-variant">
                  {r.periodLabel}
                </td>
                <td className="py-4 px-6 text-on-surface-variant">
                  {formatLKR(r.basicSalary)}
                </td>
                <td className="py-4 px-6 text-on-surface-variant">
                  {formatLKR(r.allowances)}
                </td>
                <td className="py-4 px-6 text-on-surface-variant">
                  {formatLKR(r.deductions)}
                </td>
                <td className="py-4 px-6 text-on-surface font-semibold">
                  {formatLKR(r.netSalary)}
                </td>
                <td className="py-4 px-6">
                  <div className="flex flex-col gap-1">
                    <StatusPill status={r.status} />
                    {r.status === "PAID" && r.paidDate ? (
                      <span className="text-label-sm text-on-surface-variant/80">
                        {r.paidDateLabel}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-4 px-6 text-right">
                  <RowActions record={r} onEdit={handleEdit} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <PayrollFormModal
        key={editing?.id ?? "new"}
        open={openModal}
        onClose={handleClose}
        employees={employees}
        record={editing}
      />
    </>
  );
}
