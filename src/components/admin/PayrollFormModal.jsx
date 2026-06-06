"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Modal from "@/components/admin/Modal";
import {
  createPayrollAction,
  updatePayrollAction,
} from "@/app/admin/(authed)/actions";

const MONTHS = [
  { v: 1, n: "January" },
  { v: 2, n: "February" },
  { v: 3, n: "March" },
  { v: 4, n: "April" },
  { v: 5, n: "May" },
  { v: 6, n: "June" },
  { v: 7, n: "July" },
  { v: 8, n: "August" },
  { v: 9, n: "September" },
  { v: 10, n: "October" },
  { v: 11, n: "November" },
  { v: 12, n: "December" },
];

function SubmitButton({ label, pendingLabel, icon }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[18px]">
        {pending ? "hourglass_top" : icon}
      </span>
      {pending ? pendingLabel : label}
    </button>
  );
}

const inputClass =
  "w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-shadow placeholder:text-on-surface-variant/60";

function errorClass(error) {
  return error
    ? "border-error focus:ring-error focus:border-error"
    : "border-outline-variant/40";
}

function money(n) {
  if (n === null || n === undefined) return "";
  return String(n);
}

function dateInputValue(d) {
  if (!d) return "";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "";
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function PayrollFormModal({
  open,
  onClose,
  employees,
  record,
}) {
  const isEdit = Boolean(record);
  const baseAction = isEdit ? updatePayrollAction : createPayrollAction;

  async function action(prevState, formData) {
    const result = await baseAction(prevState, formData);
    if (result?.ok) {
      onClose?.();
    }
    return result;
  }

  const [state, formAction] = useActionState(action, null);

  const [basicSalary, setBasicSalary] = useState(money(record?.basicSalary));
  const [allowances, setAllowances] = useState(money(record?.allowances ?? 0));
  const [deductions, setDeductions] = useState(money(record?.deductions ?? 0));
  const [status, setStatus] = useState(record?.status ?? "PENDING");
  const [paidDate, setPaidDate] = useState(dateInputValue(record?.paidDate));

  const net =
    (Number(basicSalary) || 0) + (Number(allowances) || 0) - (Number(deductions) || 0);
  const netDisplay = Number.isFinite(net) ? net.toFixed(2) : "0.00";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? "Edit Payroll Record" : "Add Payroll Record"}
      maxWidth="max-w-xl"
    >
      <form action={formAction} className="flex flex-col gap-4">
        {state?.ok === false ? (
          <div className="px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm border border-error-container/50">
            {state.message}
          </div>
        ) : null}

        {isEdit ? <input type="hidden" name="id" value={record.id} /> : null}

        <div className="flex flex-col gap-1">
          <label htmlFor="driverId" className="text-label-md font-semibold text-on-surface">
            Employee<span className="text-error ml-1">*</span>
          </label>
          <select
            id="driverId"
            name="driverId"
            required
            defaultValue={record?.driverId ?? ""}
            disabled={isEdit}
            className={`${inputClass} ${errorClass(state?.fieldErrors?.driverId)}`}
          >
            <option value="" disabled>
              {employees.length ? "Select an employee" : "No approved employees yet"}
            </option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.fullName} ({e.employeeId})
              </option>
            ))}
          </select>
          {state?.fieldErrors?.driverId ? (
            <span className="text-label-sm text-error">{state.fieldErrors.driverId}</span>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="periodMonth" className="text-label-md font-semibold text-on-surface">
              Month<span className="text-error ml-1">*</span>
            </label>
            <select
              id="periodMonth"
              name="periodMonth"
              required
              defaultValue={record?.periodMonth ?? new Date().getMonth() + 1}
              className={`${inputClass} ${errorClass(state?.fieldErrors?.periodMonth)}`}
            >
              {MONTHS.map((m) => (
                <option key={m.v} value={m.v}>
                  {m.n}
                </option>
              ))}
            </select>
            {state?.fieldErrors?.periodMonth ? (
              <span className="text-label-sm text-error">
                {state.fieldErrors.periodMonth}
              </span>
            ) : null}
          </div>

          <div className="flex flex-col gap-1">
            <label htmlFor="periodYear" className="text-label-md font-semibold text-on-surface">
              Year<span className="text-error ml-1">*</span>
            </label>
            <input
              id="periodYear"
              name="periodYear"
              type="number"
              required
              min={2000}
              max={2100}
              defaultValue={record?.periodYear ?? new Date().getFullYear()}
              className={`${inputClass} ${errorClass(state?.fieldErrors?.periodYear)}`}
            />
            {state?.fieldErrors?.periodYear ? (
              <span className="text-label-sm text-error">
                {state.fieldErrors.periodYear}
              </span>
            ) : null}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="basicSalary" className="text-label-md font-semibold text-on-surface">
              Basic<span className="text-error ml-1">*</span>
            </label>
            <input
              id="basicSalary"
              name="basicSalary"
              type="number"
              min="0"
              step="0.01"
              required
              value={basicSalary}
              onChange={(e) => setBasicSalary(e.target.value)}
              className={`${inputClass} ${errorClass(state?.fieldErrors?.basicSalary)}`}
            />
            {state?.fieldErrors?.basicSalary ? (
              <span className="text-label-sm text-error">
                {state.fieldErrors.basicSalary}
              </span>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="allowances" className="text-label-md font-semibold text-on-surface">
              Allowances
            </label>
            <input
              id="allowances"
              name="allowances"
              type="number"
              min="0"
              step="0.01"
              value={allowances}
              onChange={(e) => setAllowances(e.target.value)}
              className={`${inputClass} ${errorClass(state?.fieldErrors?.allowances)}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="deductions" className="text-label-md font-semibold text-on-surface">
              Deductions
            </label>
            <input
              id="deductions"
              name="deductions"
              type="number"
              min="0"
              step="0.01"
              value={deductions}
              onChange={(e) => setDeductions(e.target.value)}
              className={`${inputClass} ${errorClass(state?.fieldErrors?.deductions)}`}
            />
          </div>
        </div>

        <div className="px-4 py-3 rounded-lg bg-primary-container/15 border border-primary-container/30 flex items-center justify-between">
          <span className="text-label-md font-semibold text-on-surface">Net Salary</span>
          <span className="text-title-md text-primary font-bold">
            LKR {netDisplay}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor="status" className="text-label-md font-semibold text-on-surface">
              Status<span className="text-error ml-1">*</span>
            </label>
            <select
              id="status"
              name="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className={`${inputClass} ${errorClass(state?.fieldErrors?.status)}`}
            >
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="paidDate" className="text-label-md font-semibold text-on-surface">
              Paid Date {status === "PAID" ? (
                <span className="text-error ml-1">*</span>
              ) : (
                <span className="text-label-sm font-normal text-on-surface-variant">
                  (optional)
                </span>
              )}
            </label>
            <input
              id="paidDate"
              name="paidDate"
              type="date"
              value={paidDate}
              onChange={(e) => setPaidDate(e.target.value)}
              className={`${inputClass} ${errorClass(state?.fieldErrors?.paidDate)}`}
            />
            {state?.fieldErrors?.paidDate ? (
              <span className="text-label-sm text-error">
                {state.fieldErrors.paidDate}
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="notes" className="text-label-md font-semibold text-on-surface">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={2}
            defaultValue={record?.notes ?? ""}
            placeholder="e.g. Bonus included, advance deducted..."
            className={inputClass}
          />
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container text-label-md"
          >
            Cancel
          </button>
          <SubmitButton
            label={isEdit ? "Save Changes" : "Add Record"}
            pendingLabel="Saving..."
            icon={isEdit ? "save" : "add"}
          />
        </div>
      </form>
    </Modal>
  );
}
