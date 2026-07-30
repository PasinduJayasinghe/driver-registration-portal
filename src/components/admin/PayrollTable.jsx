"use client";

import { useState, useTransition } from "react";
import PayrollFormModal from "@/components/admin/PayrollFormModal";
import Pill from "@/components/ui/Pill";
import { deletePayrollAction, markPayrollPaidAction } from "@/app/admin/(authed)/actions";

function formatLKR(value) {
  const n = Number(value ?? 0);
  return `LKR ${n.toLocaleString("en-LK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function StatusPill({ status }) {
  return status === "PAID" ? (
    <Pill tone="positive">Paid</Pill>
  ) : (
    <Pill tone="warning">Pending</Pill>
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
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-label-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-60"
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
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors disabled:opacity-60"
      >
        <span className="material-symbols-outlined text-[16px]">edit</span>
        Edit
      </button>
      <button
        type="button"
        onClick={handleDelete}
        disabled={pending}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error text-on-error text-label-sm font-semibold hover:bg-on-error-container transition-colors disabled:opacity-60"
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
        className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-label-md font-semibold hover:bg-primary-container transition-colors"
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
        <table className="data-table">
          <thead>
            <tr>
              <th>
                Employee
              </th>
              <th>
                Period
              </th>
              <th>
                Basic
              </th>
              <th>
                Allow.
              </th>
              <th>
                Deduct.
              </th>
              <th>
                Net
              </th>
              <th>
                Status
              </th>
              <th className="num">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="text-body-md">
            {records.map((r, idx) => (
              <tr
                key={r.id}
                    >
                <td className="text-on-surface font-medium">
                  <div>{r.driver.fullName}</div>
                  <div className="text-label-sm text-on-surface-variant font-mono">
                    {r.driver.employeeId}
                  </div>
                </td>
                <td className="text-on-surface-variant">
                  {r.periodLabel}
                </td>
                <td className="text-on-surface-variant">
                  {formatLKR(r.basicSalary)}
                </td>
                <td className="text-on-surface-variant">
                  {formatLKR(r.allowances)}
                </td>
                <td className="text-on-surface-variant">
                  {formatLKR(r.deductions)}
                </td>
                <td className="text-on-surface font-semibold">
                  {formatLKR(r.netSalary)}
                </td>
                <td>
                  <div className="flex flex-col gap-1">
                    <StatusPill status={r.status} />
                    {r.status === "PAID" && r.paidDate ? (
                      <span className="text-label-sm text-on-surface-variant/80">
                        {r.paidDateLabel}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="text-right">
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
