"use client";

import { useActionState, useState, useTransition } from "react";
import { useFormStatus } from "react-dom";
import Modal from "@/components/admin/Modal";
import {
  adminUpdateTimeEntryAction,
  adminDeleteTimeEntryAction,
} from "@/app/admin/(authed)/actions";

const JOB_ROLE_LABELS = {
  driver: "Driver",
  sri_lankan_staff: "Sri Lankan Staff",
  manager: "Manager",
};

function StatusPill({ status }) {
  if (status === "OPEN") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-amber-100 text-amber-800 border border-amber-200">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
        Open
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-label-sm bg-green-100 text-green-800 border border-green-200">
      <span className="w-1.5 h-1.5 rounded-full bg-green-600" />
      Closed
    </span>
  );
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDuration(ms) {
  if (ms == null || ms < 0) return "—";
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

// Convert an ISO date to the value of a `datetime-local` input.
function toLocalInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffsetMs = d.getTimezoneOffset() * 60 * 1000;
  const local = new Date(d.getTime() - tzOffsetMs);
  return local.toISOString().slice(0, 16);
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors disabled:opacity-60"
    >
      <span className="material-symbols-outlined text-[18px]">
        {pending ? "hourglass_top" : "save"}
      </span>
      {pending ? "Saving..." : "Save"}
    </button>
  );
}

function EditForm({ entry }) {
  const [state, formAction] = useActionState(adminUpdateTimeEntryAction, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.ok === false ? (
        <div className="px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm border border-error-container/50">
          {state.message}
        </div>
      ) : null}
      <input type="hidden" name="id" value={entry.id} />
      <div className="px-3 py-2 rounded-lg bg-surface-container text-body-sm text-on-surface-variant">
        <div className="font-semibold text-on-surface">
          {entry.driver.fullName}{" "}
          <span className="font-mono text-on-surface-variant">
            ({entry.driver.employeeId})
          </span>
        </div>
        <div className="text-label-sm">
          {JOB_ROLE_LABELS[entry.driver.jobRole] ?? entry.driver.jobRole}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="clockIn" className="text-label-md font-semibold text-on-surface">
            Clock In<span className="text-error ml-1">*</span>
          </label>
          <input
            id="clockIn"
            name="clockIn"
            type="datetime-local"
            required
            defaultValue={toLocalInput(entry.clockIn)}
            className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="clockOut" className="text-label-md font-semibold text-on-surface">
            Clock Out
          </label>
          <input
            id="clockOut"
            name="clockOut"
            type="datetime-local"
            defaultValue={toLocalInput(entry.clockOut)}
            className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
          />
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
          defaultValue={entry.notes ?? ""}
          className="px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex items-center justify-end gap-2 pt-2">
        <SaveButton />
      </div>
    </form>
  );
}

function RowActions({ entry, onEdit }) {
  const [pending, startTransition] = useTransition();

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete this time entry for ${entry.driver.fullName}? This cannot be undone.`
    );
    if (!confirmed) return;
    const fd = new FormData();
    fd.append("id", entry.id);
    startTransition(() => adminDeleteTimeEntryAction(fd));
  }

  return (
    <div className="flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => onEdit(entry)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline text-on-surface-variant text-label-sm font-semibold tracking-[0.05em] hover:bg-surface-container transition-colors"
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

export default function TimeEntriesTable({ entries }) {
  const [editing, setEditing] = useState(null);

  if (entries.length === 0) {
    return (
      <div className="p-12 text-center flex flex-col items-center gap-3">
        <span className="material-symbols-outlined text-[48px] text-on-surface-variant/60">
          schedule
        </span>
        <p className="text-on-surface-variant">
          No time entries match the current filters.
        </p>
      </div>
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
                Role
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                In
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Out
              </th>
              <th className="py-3 px-6 text-label-sm text-on-surface-variant uppercase tracking-wider">
                Duration
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
            {entries.map((e, idx) => {
              const dur =
                e.clockIn && e.clockOut
                  ? new Date(e.clockOut).getTime() -
                    new Date(e.clockIn).getTime()
                  : null;
              return (
                <tr
                  key={e.id}
                  className={`border-b border-outline-variant/10 ${
                    idx % 2 === 1 ? "bg-surface-bright" : ""
                  }`}
                >
                  <td className="py-3 px-6 text-on-surface font-medium">
                    <div>{e.driver.fullName}</div>
                    <div className="text-label-sm text-on-surface-variant font-mono">
                      {e.driver.employeeId}
                    </div>
                  </td>
                  <td className="py-3 px-6 text-on-surface-variant">
                    {JOB_ROLE_LABELS[e.driver.jobRole] ?? e.driver.jobRole}
                  </td>
                  <td className="py-3 px-6 text-on-surface-variant">
                    {formatDateTime(e.clockIn)}
                  </td>
                  <td className="py-3 px-6 text-on-surface-variant">
                    {e.clockOut ? formatDateTime(e.clockOut) : "—"}
                  </td>
                  <td className="py-3 px-6 text-on-surface font-semibold">
                    {formatDuration(dur)}
                  </td>
                  <td className="py-3 px-6">
                    <StatusPill status={e.status} />
                  </td>
                  <td className="py-3 px-6 text-right">
                    <RowActions entry={e} onEdit={setEditing} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <Modal
        key={editing?.id ?? "none"}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        title="Edit Time Entry"
        maxWidth="max-w-lg"
      >
        {editing ? <EditForm entry={editing} /> : null}
      </Modal>
    </>
  );
}
