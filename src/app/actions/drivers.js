"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

const JOB_ROLES = new Set([
  "driver",
  "sri_lankan_staff",
  "manager",
]);

const ID_PREFIX = "FEN-";
const ID_PAD = 5;

function fail(message) {
  return { ok: false, message };
}

function ok(message, employeeId) {
  return { ok: true, message, employeeId };
}

async function nextEmployeeId() {
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("employeeId" FROM ${ID_PREFIX.length + 1}) AS INTEGER)), 0) AS max
    FROM "Driver"
    WHERE "employeeId" ~ ${`^${ID_PREFIX}[0-9]+$`}
  `;
  const max = Number(rows?.[0]?.max ?? 0);
  return `${ID_PREFIX}${String(max + 1).padStart(ID_PAD, "0")}`;
}

export async function registerDriver(_prevState, formData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const contactNumber = String(formData.get("contactNumber") ?? "").trim();
  const jobRole = String(formData.get("jobRole") ?? "").trim();

  if (!fullName || fullName.length < 2) {
    return fail("Please enter your full name.");
  }
  if (!contactNumber || contactNumber.length < 6) {
    return fail("Please enter a valid contact number.");
  }
  if (!JOB_ROLES.has(jobRole)) {
    return fail("Please choose a job role.");
  }

  let employeeId;
  let lastError;
  for (let attempt = 0; attempt < 5; attempt++) {
    employeeId = await nextEmployeeId();
    try {
      await prisma.driver.create({
        data: { fullName, employeeId, contactNumber, jobRole },
      });
      lastError = null;
      break;
    } catch (error) {
      lastError = error;
      if (error?.code !== "P2002") {
        console.error("registerDriver failed", error);
        return fail("Something went wrong. Please try again.");
      }
      // Unique-constraint race — loop and try the next number.
    }
  }

  if (lastError) {
    console.error("registerDriver exhausted retries", lastError);
    return fail("Couldn't allocate an Employee ID. Please try again.");
  }

  revalidatePath("/admin");
  revalidatePath("/admin/requests");
  return ok(
    "Details submitted successfully. Please wait for admin confirmation.",
    employeeId
  );
}
