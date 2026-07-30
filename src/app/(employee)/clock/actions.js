"use server";

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { addHours } from "@/lib/time";

async function getCurrentDriver() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return prisma.driver.findUnique({
    where: { userId: user.id },
    select: { id: true, fullName: true, employeeId: true },
  });
}

function fail(message) {
  return { ok: false, message };
}

function ok(message) {
  return { ok: true, message };
}

// Auto-close any OPEN entries from previous days. Sets clockOut = clockIn + 9h
// and tags the entry so admin can spot/fix it.
export async function autoCloseStaleEntries(driverId) {
  const now = new Date();
  const openEntries = await prisma.timeEntry.findMany({
    where: { driverId, status: "OPEN" },
  });
  for (const entry of openEntries) {
    if (!entry.clockIn) continue;
    const diffMs = now.getTime() - new Date(entry.clockIn).getTime();
    if (diffMs > 24 * 60 * 60 * 1000) {
      await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          status: "CLOSED",
          clockOut: addHours(entry.clockIn, 9),
          notes: entry.notes
            ? `${entry.notes}\nAuto-closed: forgot to clock out`
            : "Auto-closed: forgot to clock out",
        },
      });
    }
  }
}

export async function clockInAction(_prevState, formData) {
  void formData;
  const driver = await getCurrentDriver();
  if (!driver) return fail("You're not signed in.");

  await autoCloseStaleEntries(driver.id);

  const existing = await prisma.timeEntry.findFirst({
    where: { driverId: driver.id, status: "OPEN" },
  });
  if (existing) {
    return fail("You're already clocked in. Clock out first.");
  }

  await prisma.timeEntry.create({
    data: {
      driverId: driver.id,
      clockIn: new Date(),
      status: "OPEN",
    },
  });

  revalidatePath("/clock");
  revalidatePath("/history");
  revalidatePath("/admin/time-entries");
  revalidatePath("/admin/reports");
  return ok("Clocked in.");
}

export async function clockOutAction(_prevState, formData) {
  void formData;
  const driver = await getCurrentDriver();
  if (!driver) return fail("You're not signed in.");

  const open = await prisma.timeEntry.findFirst({
    where: { driverId: driver.id, status: "OPEN" },
  });
  if (!open) {
    return fail("You're not currently clocked in.");
  }

  await prisma.timeEntry.update({
    where: { id: open.id },
    data: {
      clockOut: new Date(),
      status: "CLOSED",
    },
  });

  revalidatePath("/clock");
  revalidatePath("/history");
  revalidatePath("/admin/time-entries");
  revalidatePath("/admin/reports");
  return ok("Clocked out.");
}
