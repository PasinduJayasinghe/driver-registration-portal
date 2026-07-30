"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { registerDriver } from "@/app/actions/drivers";

const initialState = {
  ok: false,
  message: "",
  employeeId: null,
  fieldErrors: {},
};

function TextField({
  name,
  label,
  error,
  type = "text",
  placeholder,
  required,
  ...inputProps
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={name}
        className="text-label-md font-semibold text-on-surface"
      >
        {label}
        {required ? <span className="text-error ml-1">*</span> : null}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        aria-invalid={error ? "true" : undefined}
        aria-describedby={error ? `${name}-error` : undefined}
        className={`px-3.5 py-2.5 border rounded-xl bg-surface-container/60 text-on-surface focus:outline-none focus:ring-4 focus:bg-surface-container-lowest transition-[background-color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] ${
          error
            ? "border-error focus:border-error focus:ring-error/15"
            : "border-outline-variant/50 hover:border-outline-variant focus:border-primary focus:ring-primary/12"
        }`}
        {...inputProps}
      />
      {error ? (
        <span id={`${name}-error`} className="text-label-sm text-error">
          {error}
        </span>
      ) : null}
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full mt-stack-lg inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary py-3.5 px-4 rounded-full transition-[background-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-ios)] focus:outline-none shadow-[var(--shadow-e1)] hover:shadow-[var(--shadow-e2)] text-label-lg font-semibold active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed disabled:shadow-none"
    >
      {pending ? (
        <span className="material-symbols-outlined text-[18px] animate-spin">
          progress_activity
        </span>
      ) : null}
      {pending ? "Submitting…" : "Submit for Approval"}
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
    <div className="w-full max-w-lg bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e3)] border border-outline-variant/30 p-stack-lg">
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
        <TextField
          name="fullName"
          label="Your Name"
          placeholder="Enter your Name"
          required
          error={state.fieldErrors?.fullName}
        />

        <TextField
          name="email"
          label="Your Email"
          type="email"
          placeholder="Enter the Email"
          required
          error={state.fieldErrors?.email}
        />

        <TextField
          name="contactNumber"
          label="Mobile Number"
          type="tel"
          placeholder="Enter the Mobile Number"
          required
          error={state.fieldErrors?.contactNumber}
        />

        <TextField
          name="address"
          label="Address"
          placeholder="Enter the Address"
          required
          error={state.fieldErrors?.address}
        />

        <p className="text-body-md text-on-surface pt-stack-sm">
          Please provide your nationality, years of driving experience,
          driver&apos;s license number, and license type.
        </p>

        <TextField
          name="nationality"
          label="Nationality"
          placeholder="Enter your Nationality"
          required
          error={state.fieldErrors?.nationality}
        />

        <TextField
          name="yearsOfExperience"
          label="Years of Driving Experience"
          type="number"
          min="0"
          max="70"
          step="1"
          placeholder="Enter the number of years"
          required
          error={state.fieldErrors?.yearsOfExperience}
        />

        <TextField
          name="licenceNumber"
          label="Driver's Licence Number"
          placeholder="Enter the Licence Number"
          required
          error={state.fieldErrors?.licenceNumber}
        />

        <div className="flex flex-col gap-1">
          <label
            htmlFor="licenceType"
            className="text-label-md font-semibold text-on-surface"
          >
            Licence Type
            <span className="text-error ml-1">*</span>
          </label>
          <select
            id="licenceType"
            name="licenceType"
            required
            defaultValue=""
            aria-invalid={state.fieldErrors?.licenceType ? "true" : undefined}
            className={`px-3 py-2 border rounded-lg bg-surface-container-lowest text-on-surface focus:outline-none focus:ring-2 transition-shadow appearance-none cursor-pointer ${
              state.fieldErrors?.licenceType
                ? "border-error focus:border-error focus:ring-error/20"
                : "border-outline focus:border-primary focus:ring-primary-container/20"
            }`}
          >
            <option value="" disabled>
              Select a licence type...
            </option>
            <option value="full_uk">Full UK Licence</option>
            <option value="provisional_uk">Provisional UK Licence</option>
            <option value="eu">EU Licence</option>
            <option value="international">International Licence</option>
            <option value="other">Other</option>
          </select>
          {state.fieldErrors?.licenceType ? (
            <span className="text-label-sm text-error">
              {state.fieldErrors.licenceType}
            </span>
          ) : null}
        </div>

        <SubmitButton />
      </form>

      {showSuccess ? (
        <div className="mt-stack-lg p-4 bg-surface-container-low border border-primary-fixed rounded-xl shadow-[var(--shadow-e1)] flex items-start gap-3">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-primary filled mt-0.5"
          >
            check_circle
          </span>
          <div className="flex-1">
            <h3 className="text-label-md font-semibold text-on-surface mb-1">
              Success
            </h3>
            <p className="text-body-md text-on-surface-variant text-sm">
              {state.message}
            </p>
            {state.employeeId ? (
              <div className="mt-3 p-3 rounded-lg bg-surface-container-lowest border border-outline-variant">
                <div className="text-label-sm uppercase tracking-[0.08em] text-on-surface-variant">
                  Your Employee ID
                </div>
                <div className="text-headline-md font-bold text-primary mt-0.5 font-mono">
                  {state.employeeId}
                </div>
                <p className="text-label-sm text-on-surface-variant mt-1">
                  Save this ID — you&apos;ll need it for future reference.
                </p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showError ? (
        <div className="mt-stack-lg p-4 bg-error-container border border-error/30 rounded-xl shadow-[var(--shadow-e1)] flex items-start gap-3">
          <span
            aria-hidden="true"
            className="material-symbols-outlined text-on-error-container filled mt-0.5"
          >
            error
          </span>
          <div>
            <h3 className="text-label-md font-semibold text-on-error-container mb-1">
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
