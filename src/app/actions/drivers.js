"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const JOB_ROLES = new Set([
  "driver",
  "sri_lankan_staff",
  "manager",
]);

function fail(message) {
  return { ok: false, message };
}

function ok(message) {
  return { ok: true, message };
}

export async function registerDriver(_prevState, formData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const employeeId = String(formData.get("employeeId") ?? "").trim();
  const contactNumber = String(formData.get("contactNumber") ?? "").trim();
  const jobRole = String(formData.get("jobRole") ?? "").trim();

  if (!fullName || fullName.length < 2) {
    return fail("Please enter your full name.");
  }
  if (!employeeId) {
    return fail("Employee ID is required.");
  }
  if (!contactNumber || contactNumber.length < 6) {
    return fail("Please enter a valid contact number.");
  }
  if (!JOB_ROLES.has(jobRole)) {
    return fail("Please choose a job role.");
  }

  try {
    await prisma.driver.create({
      data: { fullName, employeeId, contactNumber, jobRole },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return fail("This Employee ID has already been submitted.");
    }
    console.error("registerDriver failed", error);
    return fail("Something went wrong. Please try again.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  return ok("Details submitted successfully. Please wait for admin confirmation.");
}
