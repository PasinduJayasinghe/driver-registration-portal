"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { employeeSignIn } from "@/app/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-full bg-primary text-on-primary text-label-lg font-semibold hover:bg-primary-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[20px]">
        {pending ? "hourglass_top" : "login"}
      </span>
      {pending ? "Signing in..." : "Sign In"}
    </button>
  );
}

export default function EmployeeLoginForm() {
  const [state, formAction] = useActionState(employeeSignIn, null);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state?.ok === false ? (
        <div className="px-3 py-2 rounded-lg bg-error-container text-on-error-container text-body-sm border border-error-container/50">
          {state.message}
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-label-md font-semibold text-on-surface">
          Email<span className="text-error ml-1">*</span>
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          placeholder="you@fenixcars.lk"
          className="w-full px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none transition-shadow placeholder:text-on-surface-variant/60"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-label-md font-semibold text-on-surface">
          Password<span className="text-error ml-1">*</span>
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="w-full px-3.5 py-2.5 bg-surface-container/70 rounded-xl border border-outline-variant/50 text-body-md text-on-surface transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] hover:border-outline-variant focus:bg-surface-container-lowest focus:border-primary focus:ring-4 focus:ring-primary/12 focus:outline-none transition-shadow placeholder:text-on-surface-variant/60"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
