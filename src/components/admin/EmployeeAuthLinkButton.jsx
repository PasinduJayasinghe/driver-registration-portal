"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Modal from "@/components/admin/Modal";
import { adminSetupEmployeeLoginAction } from "@/app/admin/(authed)/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-primary text-on-primary text-label-md font-semibold tracking-[0.05em] hover:bg-primary-container transition-colors disabled:opacity-60"
    >
      <span className="material-symbols-outlined text-[18px]">
        {pending ? "hourglass_top" : "mail"}
      </span>
      {pending ? "Sending..." : "Send Login Email"}
    </button>
  );
}

export default function EmployeeAuthLinkButton({ driver }) {
  const [open, setOpen] = useState(false);
  const [state, formAction] = useActionState(adminSetupEmployeeLoginAction, null);

  const linked = Boolean(driver.userId);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary text-primary text-label-sm font-semibold tracking-[0.05em] hover:bg-primary-container/10 transition-colors"
      >
        <span className="material-symbols-outlined text-[16px]">
          {linked ? "refresh" : "key"}
        </span>
        {linked ? "Resend Login" : "Set Up Login"}
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={linked ? "Resend Login Email" : "Set Up Login"}
      >
        <form action={formAction} className="flex flex-col gap-4">
          {state?.ok === false ? (
            <div className="px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm border border-error-container/50">
              {state.message}
            </div>
          ) : null}
          {state?.ok ? (
            <div className="px-3 py-2 rounded-lg bg-green-100 text-green-800 text-body-sm border border-green-200">
              {state.message}
            </div>
          ) : null}
          <input type="hidden" name="driverId" value={driver.id} />
          <p className="text-body-sm text-on-surface-variant">
            We will email <span className="font-semibold">{driver.fullName}</span>{" "}
            a link to set their own password. They will sign in at{" "}
            <span className="font-mono text-on-surface">/login</span>.
          </p>
          <div className="flex flex-col gap-1">
            <label htmlFor="email" className="text-label-md font-semibold text-on-surface">
              Email<span className="text-error ml-1">*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              defaultValue={driver.email ?? ""}
              placeholder="name@fenixcars.lk"
              className="w-full px-3 py-2 bg-surface-container rounded-lg border border-outline-variant/40 text-body-md text-on-surface focus:ring-2 focus:ring-primary focus:border-primary focus:outline-none placeholder:text-on-surface-variant/60"
            />
          </div>
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
