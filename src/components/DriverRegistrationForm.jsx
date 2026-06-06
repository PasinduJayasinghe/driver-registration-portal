"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { registerDriver } from "@/app/actions/drivers";

const initialState = { ok: false, message: "" };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full mt-stack-lg bg-[#DE5C35] hover:bg-[#c84c26] text-on-primary font-label py-3 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DE5C35] shadow-sm text-label-md tracking-[0.05em] font-semibold uppercase disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Submitting..." : "Submit for Approval"}
    </button>
  );
}

export default function DriverRegistrationForm() {
  const [state, formAction] = useActionState(registerDriver, initialState);
  const formRef = useRef(null);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  const showSuccess = state.ok;
  const showError = !state.ok && state.message;

  return (
    <div className="w-full max-w-md bg-surface-container-lowest shadow-md rounded-xl p-stack-lg border-t-4 border-primary">
      <div aria-hidden="true" className="flex items-center justify-between mb-stack-lg">
        <div className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-medium ${
              showSuccess
                ? "bg-primary text-on-primary"
                : "bg-primary text-on-primary"
            }`}
          >
            {showSuccess ? (
              <span className="material-symbols-outlined filled text-[18px]">
                check
              </span>
            ) : (
              "1"
            )}
          </div>
          <span className="text-[10px] mt-1 text-label-sm text-primary uppercase">
            Details
          </span>
        </div>
        <div
          className={`flex-1 h-px mx-2 ${
            showSuccess ? "bg-primary" : "bg-outline-variant"
          }`}
        />
        <div className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-medium border-2 ${
              showSuccess
                ? "bg-primary text-on-primary border-primary"
                : "border-outline-variant bg-surface text-on-surface-variant"
            }`}
          >
            {showSuccess ? (
              <span className="material-symbols-outlined filled text-[18px]">
                check
              </span>
            ) : (
              "2"
            )}
          </div>
          <span
            className={`text-[10px] mt-1 text-label-sm uppercase ${
              showSuccess ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            Review
          </span>
        </div>
        <div
          className={`flex-1 h-px mx-2 ${
            showSuccess ? "bg-primary" : "bg-outline-variant"
          }`}
        />
        <div className="flex flex-col items-center">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-label-sm font-medium border-2 ${
              showSuccess
                ? "bg-primary text-on-primary border-primary"
                : "border-outline-variant bg-surface text-on-surface-variant"
            }`}
          >
            {showSuccess ? (
              <span className="material-symbols-outlined filled text-[18px]">
                check
              </span>
            ) : (
              "3"
            )}
          </div>
          <span
            className={`text-[10px] mt-1 text-label-sm uppercase ${
              showSuccess ? "text-primary" : "text-on-surface-variant"
            }`}
          >
            Done
          </span>
        </div>
      </div>

      <form ref={formRef} action={formAction} className="space-y-stack-md">
        <div className="flex flex-col gap-1">
          <label
            htmlFor="fullName"
            className="text-label-md font-semibold tracking-[0.05em] text-on-surface"
          >
            Full Name
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            placeholder="Jane Doe"
            className="px-3 py-2 border border-outline rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/20 transition-shadow"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="employeeId"
            className="text-label-md font-semibold tracking-[0.05em] text-on-surface"
          >
            Employee ID
          </label>
          <input
            id="employeeId"
            name="employeeId"
            type="text"
            required
            placeholder="FEN-12345"
            className="px-3 py-2 border border-outline rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/20 transition-shadow"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="contactNumber"
            className="text-label-md font-semibold tracking-[0.05em] text-on-surface"
          >
            Contact Number
          </label>
          <input
            id="contactNumber"
            name="contactNumber"
            type="tel"
            required
            placeholder="+1 (555) 000-0000"
            className="px-3 py-2 border border-outline rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/20 transition-shadow"
          />
        </div>

        <div className="flex flex-col gap-1">
          <label
            htmlFor="jobRole"
            className="text-label-md font-semibold tracking-[0.05em] text-on-surface"
          >
            Job Role
          </label>
          <select
            id="jobRole"
            name="jobRole"
            required
            defaultValue=""
            className="px-3 py-2 border border-outline rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-container/20 transition-shadow appearance-none cursor-pointer"
          >
            <option value="" disabled>
              Select a role...
            </option>
            <option value="technician">Service Technician</option>
            <option value="sales">Sales Associate</option>
            <option value="manager">Branch Manager</option>
            <option value="support">Customer Support</option>
          </select>
        </div>

        <SubmitButton />
      </form>

      {showSuccess ? (
        <div className="mt-stack-lg p-4 bg-surface-container-low border border-primary-fixed rounded-lg shadow-sm flex items-start gap-3">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-primary filled mt-0.5"
          >
            check_circle
          </span>
          <div>
            <h3 className="text-label-md font-semibold tracking-[0.05em] text-on-surface mb-1">
              Success
            </h3>
            <p className="text-body-md text-on-surface-variant text-sm">
              {state.message}
            </p>
          </div>
        </div>
      ) : null}

      {showError ? (
        <div className="mt-stack-lg p-4 bg-error-container border border-error/30 rounded-lg shadow-sm flex items-start gap-3">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-on-error-container filled mt-0.5"
          >
            error
          </span>
          <div>
            <h3 className="text-label-md font-semibold tracking-[0.05em] text-on-error-container mb-1">
              We couldn&apos;t submit your details
            </h3>
            <p className="text-body-md text-on-error-container text-sm">
              {state.message}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
