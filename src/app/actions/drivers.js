"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createEmployeeWithAutoId } from "@/lib/employee-id";

// Public self-registration is drivers only. Sri Lankan staff and managers are
// internal roles created by an admin from /admin/employees.
const JOB_ROLES = new Set(["driver"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Licence categories offered on the public form.
const LICENCE_TYPES = new Set([
  "full_uk",
  "provisional_uk",
  "international",
  "eu",
  "other",
]);

function fail(message, fieldErrors) {
  return { ok: false, message, fieldErrors: fieldErrors ?? {} };
}

function ok(message, employeeId) {
  return { ok: true, message, employeeId: employeeId ?? null };
}

export async function registerDriver(_prevState, formData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const contactNumber = String(formData.get("contactNumber") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const nationality = String(formData.get("nationality") ?? "").trim();
  const yearsRaw = String(formData.get("yearsOfExperience") ?? "").trim();
  const licenceNumber = String(formData.get("licenceNumber") ?? "").trim();
  const licenceType = String(formData.get("licenceType") ?? "").trim();

  // Public registration is always a driver; the form no longer asks.
  const jobRole = "driver";

  const fieldErrors = {};
  if (!fullName || fullName.length < 2) {
    fieldErrors.fullName = "Please enter your full name.";
  }
  if (!email || !EMAIL_RE.test(email)) {
    fieldErrors.email = "Please enter a valid email address.";
  }
  if (!contactNumber || contactNumber.length < 6) {
    fieldErrors.contactNumber = "Please enter a valid contact number.";
  }
  if (!address || address.length < 5) {
    fieldErrors.address = "Please enter your address.";
  }
  if (!nationality || nationality.length < 2) {
    fieldErrors.nationality = "Please enter your nationality.";
  }

  const yearsOfExperience = Number(yearsRaw);
  if (
    yearsRaw === "" ||
    !Number.isInteger(yearsOfExperience) ||
    yearsOfExperience < 0 ||
    yearsOfExperience > 70
  ) {
    fieldErrors.yearsOfExperience = "Enter your years of driving experience.";
  }
  if (!licenceNumber || licenceNumber.length < 4) {
    fieldErrors.licenceNumber = "Please enter your driver's licence number.";
  }
  if (!LICENCE_TYPES.has(licenceType)) {
    fieldErrors.licenceType = "Please choose your licence type.";
  }
  if (!JOB_ROLES.has(jobRole)) {
    fieldErrors.jobRole = "Please choose a job role.";
  }
  if (Object.keys(fieldErrors).length) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const result = await createEmployeeWithAutoId({
    fullName,
    email,
    contactNumber,
    address,
    jobRole,
    nationality,
    yearsOfExperience,
    licenceNumber,
    licenceType,
  });

  if (!result.ok) {
    console.error("registerDriver exhausted retries", result.error);
    return fail("Couldn't allocate an Employee ID. Please try again.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  return ok(
    "Details submitted successfully. Please wait for admin confirmation.",
    result.driver.employeeId
  );
}
