"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { createEmployeeWithAutoId } from "@/lib/employee-id";

const JOB_ROLES = new Set(["driver", "sri_lankan_staff", "manager"]);

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function requireAdminEmail() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  return user.email ?? user.id;
}

function fail(message, fieldErrors) {
  return { ok: false, message, fieldErrors: fieldErrors ?? {} };
}

function ok(message) {
  return { ok: true, message };
}

async function updateStatus(id, status) {
  const reviewer = await requireAdminEmail();
  await prisma.driver.update({
    where: { id },
    data: {
      status,
      reviewedAt: new Date(),
      reviewedByEmail: reviewer,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/employees");
}

export async function approveDriver(formData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await updateStatus(id, "APPROVED");
}

export async function rejectDriver(formData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await updateStatus(id, "REJECTED");
}

export async function resetDriver(formData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await requireAdminEmail();
  await prisma.driver.update({
    where: { id },
    data: { status: "PENDING", reviewedAt: null, reviewedByEmail: null },
  });
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/employees");
}

export async function deleteDriver(formData) {
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await requireAdminEmail();
  await prisma.driver.delete({ where: { id } });
  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  revalidatePath("/admin/employees");
}

export async function createEmployeeAction(_prevState, formData) {
  await requireAdminEmail();

  const fullName = String(formData.get("fullName") ?? "").trim();
  const contactNumber = String(formData.get("contactNumber") ?? "").trim();
  const jobRole = String(formData.get("jobRole") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();

  const fieldErrors = {};
  if (!fullName || fullName.length < 2) {
    fieldErrors.fullName = "Please enter the full name.";
  }
  if (!contactNumber || contactNumber.length < 6) {
    fieldErrors.contactNumber = "Please enter a valid contact number.";
  }
  if (!JOB_ROLES.has(jobRole)) {
    fieldErrors.jobRole = "Please choose a job role.";
  }
  if (email && !EMAIL_RE.test(email)) {
    fieldErrors.email = "Please enter a valid email address.";
  }
  if (Object.keys(fieldErrors).length) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const result = await createEmployeeWithAutoId({
    fullName,
    contactNumber,
    jobRole,
    email: email || null,
    address: address || null,
    status: "APPROVED",
    reviewedAt: new Date(),
    reviewedByEmail: await requireAdminEmail().catch(() => null),
  });

  if (!result.ok) {
    console.error("createEmployeeAction exhausted retries", result.error);
    return fail("Couldn't allocate an Employee ID. Please try again.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/employees");
  revalidatePath("/admin/requests");
  return ok(`Added ${result.driver.fullName} (${result.driver.employeeId}).`);
}

function parseMoney(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export async function createPayrollAction(_prevState, formData) {
  await requireAdminEmail();

  const driverId = String(formData.get("driverId") ?? "").trim();
  const periodMonth = Number(formData.get("periodMonth") ?? "");
  const periodYear = Number(formData.get("periodYear") ?? "");
  const basicSalary = parseMoney(formData.get("basicSalary"));
  const allowances = parseMoney(formData.get("allowances"));
  const deductions = parseMoney(formData.get("deductions"));
  const status = String(formData.get("status") ?? "PENDING");
  const paidDateRaw = String(formData.get("paidDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors = {};
  if (!driverId) fieldErrors.driverId = "Please pick an employee.";
  if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    fieldErrors.periodMonth = "Month must be between 1 and 12.";
  }
  if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) {
    fieldErrors.periodYear = "Please enter a valid year.";
  }
  if (basicSalary === null) fieldErrors.basicSalary = "Enter a valid amount.";
  if (allowances === null) fieldErrors.allowances = "Enter a valid amount.";
  if (deductions === null) fieldErrors.deductions = "Enter a valid amount.";
  if (status !== "PENDING" && status !== "PAID") {
    fieldErrors.status = "Invalid status.";
  }
  if (status === "PAID" && !paidDateRaw) {
    fieldErrors.paidDate = "Paid date is required when status is Paid.";
  }
  if (Object.keys(fieldErrors).length) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const driver = await prisma.driver.findUnique({ where: { id: driverId } });
  if (!driver) {
    return fail("Selected employee no longer exists.", { driverId: "Not found." });
  }

  const netSalary = basicSalary + allowances - deductions;
  const paidDate = paidDateRaw ? new Date(paidDateRaw) : null;

  try {
    await prisma.payroll.create({
      data: {
        driverId,
        periodMonth,
        periodYear,
        basicSalary,
        allowances,
        deductions,
        netSalary,
        status,
        paidDate,
        notes: notes || null,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return fail(
        "A payroll record already exists for this employee and month.",
        { periodMonth: "Duplicate period." }
      );
    }
    console.error("createPayrollAction failed", error);
    return fail("Couldn't save the payroll record. Please try again.");
  }

  revalidatePath("/admin/payroll");
  return ok("Payroll record saved.");
}

export async function updatePayrollAction(_prevState, formData) {
  await requireAdminEmail();

  const id = String(formData.get("id") ?? "").trim();
  if (!id) return fail("Missing record id.");

  const periodMonth = Number(formData.get("periodMonth") ?? "");
  const periodYear = Number(formData.get("periodYear") ?? "");
  const basicSalary = parseMoney(formData.get("basicSalary"));
  const allowances = parseMoney(formData.get("allowances"));
  const deductions = parseMoney(formData.get("deductions"));
  const status = String(formData.get("status") ?? "PENDING");
  const paidDateRaw = String(formData.get("paidDate") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  const fieldErrors = {};
  if (!Number.isInteger(periodMonth) || periodMonth < 1 || periodMonth > 12) {
    fieldErrors.periodMonth = "Month must be between 1 and 12.";
  }
  if (!Number.isInteger(periodYear) || periodYear < 2000 || periodYear > 2100) {
    fieldErrors.periodYear = "Please enter a valid year.";
  }
  if (basicSalary === null) fieldErrors.basicSalary = "Enter a valid amount.";
  if (allowances === null) fieldErrors.allowances = "Enter a valid amount.";
  if (deductions === null) fieldErrors.deductions = "Enter a valid amount.";
  if (status !== "PENDING" && status !== "PAID") {
    fieldErrors.status = "Invalid status.";
  }
  if (status === "PAID" && !paidDateRaw) {
    fieldErrors.paidDate = "Paid date is required when status is Paid.";
  }
  if (Object.keys(fieldErrors).length) {
    return fail("Please fix the highlighted fields.", fieldErrors);
  }

  const netSalary = basicSalary + allowances - deductions;
  const paidDate = paidDateRaw ? new Date(paidDateRaw) : null;

  try {
    await prisma.payroll.update({
      where: { id },
      data: {
        periodMonth,
        periodYear,
        basicSalary,
        allowances,
        deductions,
        netSalary,
        status,
        paidDate,
        notes: notes || null,
      },
    });
  } catch (error) {
    if (error?.code === "P2002") {
      return fail(
        "Another payroll record already exists for that period.",
        { periodMonth: "Duplicate period." }
      );
    }
    console.error("updatePayrollAction failed", error);
    return fail("Couldn't update the payroll record. Please try again.");
  }

  revalidatePath("/admin/payroll");
  return ok("Payroll record updated.");
}

export async function deletePayrollAction(formData) {
  await requireAdminEmail();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.payroll.delete({ where: { id } });
  revalidatePath("/admin/payroll");
}

export async function markPayrollPaidAction(formData) {
  await requireAdminEmail();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) return;
  await prisma.payroll.update({
    where: { id },
    data: { status: "PAID", paidDate: new Date() },
  });
  revalidatePath("/admin/payroll");
}
