"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Modal from "@/components/admin/Modal";
import { createEmployeeAction } from "@/app/admin/(authed)/actions";

const JOB_ROLES = [
  { value: "driver", label: "Driver" },
  { value: "sri_lankan_staff", label: "Sri Lankan Staff" },
  { value: "manager", label: "Manager" },
];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[18px]">
        {pending ? "hourglass_top" : "person_add"}
      </span>
      {pending ? "Saving..." : "Add Employee"}
    </button>
  );
}

export default function AddEmployeeButton() {
  const [open, setOpen] = useState(false);

  async function action(prevState, formData) {
    const result = await createEmployeeAction(prevState, formData);
    if (result?.ok) {
      setOpen(false);
    }
    return result;
  }

  const [state, formAction] = useActionState(action, null);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">person_add</span>
        Add Employee
      </button>

      <Modal open={open} onClose={() => setOpen(false)} title="Add Employee">
        <form action={formAction} className="flex flex-col gap-4">
          {state?.ok === false ? (
            <div className="px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm border border-error-container/50">
              {state.message}
            </div>
          ) : null}

          <Field
            name="fullName"
            label="Full Name"
            required
            error={state?.fieldErrors?.fullName}
            autoFocus
          />
          <Field
            name="contactNumber"
            label="Contact Number"
            required
            error={state?.fieldErrors?.contactNumber}
          />
          <SelectField
            name="jobRole"
            label="Job Role"
            required
            error={state?.fieldErrors?.jobRole}
            options={JOB_ROLES}
            placeholder="Select a role"
          />
          <Field
            name="email"
            label="Email (optional)"
            type="email"
            error={state?.fieldErrors?.email}
            placeholder="name@example.com"
          />
          <Field
            name="address"
            label="Address (optional)"
            error={state?.fieldErrors?.address}
            multiline
          />

          <p className="text-label-sm text-on-surface-variant/80">
            An Employee ID will be auto-generated and the record will be marked as Approved.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-2 rounded-full text-on-surface-variant hover:bg-surface-container text-label-md"
            >
              Cancel
            </button>
            <SubmitButton />
          </div>
        </form>
      </Modal>
    </>
  );
}

function Field({ name, label, required, error, type = "text", autoFocus, placeholder, multiline }) {
  const baseClass =
    "w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-shadow placeholder:text-on-surface-variant/60";
  const errorClass = error
    ? "border-error focus:ring-error focus:border-error"
    : "";

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-label-md font-semibold text-on-surface">
        {label}
        {required ? <span className="text-error ml-1">*</span> : null}
      </label>
      {multiline ? (
        <textarea
          id={name}
          name={name}
          rows={2}
          placeholder={placeholder}
          className={`${baseClass} ${errorClass}`}
        />
      ) : (
        <input
          id={name}
          name={name}
          type={type}
          required={required}
          autoFocus={autoFocus}
          placeholder={placeholder}
          className={`${baseClass} ${errorClass}`}
        />
      )}
      {error ? <span className="text-label-sm text-error">{error}</span> : null}
    </div>
  );
}

function SelectField({ name, label, required, error, options, placeholder }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={name} className="text-label-md font-semibold text-on-surface">
        {label}
        {required ? <span className="text-error ml-1">*</span> : null}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue=""
        className={`w-full px-3 py-2 bg-surface-container rounded-lg border text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none transition-shadow ${
          error
            ? "border-error focus:ring-error focus:border-error"
            : "border-outline-variant/40"
        }`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-label-sm text-error">{error}</span> : null}
    </div>
  );
}
