"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

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
