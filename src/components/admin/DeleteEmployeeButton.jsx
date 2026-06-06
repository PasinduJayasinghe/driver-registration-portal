"use client";

import { useTransition } from "react";
import { deleteDriver } from "@/app/admin/(authed)/actions";

export default function DeleteEmployeeButton({ id, name }) {
  const [pending, startTransition] = useTransition();

  function handleClick() {
    const confirmed = window.confirm(
      `Remove ${name}? This permanently deletes their record and cannot be undone.`
    );
    if (!confirmed) return;
    const formData = new FormData();
    formData.append("id", id);
    startTransition(() => deleteDriver(formData));
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-error text-on-error text-label-sm font-semibold tracking-[0.05em] hover:bg-on-error-container transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <span className="material-symbols-outlined text-[16px]">
        {pending ? "hourglass_top" : "delete"}
      </span>
      {pending ? "Removing..." : "Remove"}
    </button>
  );
}
