"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { signIn } from "@/app/admin/login/actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full mt-2 bg-primary hover:bg-primary-container text-on-primary font-semibold py-3 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary shadow-sm uppercase tracking-[0.05em] text-label-md disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Signing in..." : "Sign In"}
    </button>
  );
}

export default function LoginForm({ next }) {
  const [state, formAction] = useActionState(signIn, { ok: false, message: "" });

  return (
    <form action={formAction} className="space-y-stack-md">
      <input type="hidden" name="next" value={next ?? "/admin"} />
      <div className="flex flex-col gap-1">
        <label
          htmlFor="email"
          className="text-label-md font-semibold tracking-[0.05em] text-on-surface"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="admin@fenixcars.com"
          className="px-3 py-2 border border-outline rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/20 transition-shadow"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label
          htmlFor="password"
          className="text-label-md font-semibold tracking-[0.05em] text-on-surface"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          placeholder="••••••••"
          className="px-3 py-2 border border-outline rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/20 transition-shadow"
        />
      </div>

      {state.message && !state.ok ? (
        <div className="p-3 bg-error-container border border-error/30 rounded-lg flex items-start gap-2">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-on-error-container filled text-[20px] mt-0.5"
          >
            error
          </span>
          <p className="text-sm text-on-error-container">{state.message}</p>
        </div>
      ) : null}

      <SubmitButton />
    </form>
  );
}
