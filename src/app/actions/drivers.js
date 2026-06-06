"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { createEmployeeWithAutoId } from "@/lib/employee-id";

const JOB_ROLES = new Set(["driver", "sri_lankan_staff", "manager"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function fail(message, fieldErrors) {
  return { ok: false, message, fieldErrors: fieldErrors ?? {} };
}

function ok(message) {
  return { ok: true, message };
}

export async function registerDriver(_prevState, formData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const contactNumber = String(formData.get("contactNumber") ?? "").trim();
  const jobRole = String(formData.get("jobRole") ?? "").trim();

  const fieldErrors = {};
  if (!fullName || fullName.length < 2) {
    fieldErrors.fullName = "Please enter your full name.";
  }
  if (!contactNumber || contactNumber.length < 6) {
    fieldErrors.contactNumber = "Please enter a valid contact number.";
  }
  if (!JOB_ROLES.has(jobRole)) {
    fieldErrors.jobRole = "Please choose a job role.";
  }
  if (Object.keys(fieldErrors).length) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const result = await createEmployeeWithAutoId({
    fullName,
    contactNumber,
    jobRole,
  });

  if (!result.ok) {
    console.error("registerDriver exhausted retries", result.error);
    return fail("Couldn't allocate an Employee ID. Please try again.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  return ok(
    "Details submitted successfully. Please wait for admin confirmation."
  );
}
