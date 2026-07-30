"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { addHours, AUTO_CLOSE_HOURS } from "@/lib/time";
import { requireEmployee } from "@/lib/auth";

// Returns the signed-in employee, or null when the caller isn't an active
// employee with clock access (admins included — they have no Driver row).
async function getCurrentDriver() {
  try {
    return await requireEmployee();
  } catch {
    return null;
  }
}

function fail(message) {
  return { ok: false, message };
}

function ok(message) {
  return { ok: true, message };
}

// Auto-close any OPEN entries from previous days. Sets clockOut = clockIn + 9h
// and tags the entry so admin can spot/fix it.
//
// SECURITY: every export in a "use server" module is a callable endpoint, so
// this must never trust a caller-supplied driverId. It resolves the driver from
// the session instead, which also keeps it safe to call from a page render.
export async function autoCloseStaleEntries() {
  const driver = await getCurrentDriver();
  if (!driver) return;

  const now = new Date();
  const staleBefore = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Let the database do the filtering — the common case is zero rows, which
  // the [driverId, clockIn] index answers without reading any.
  const staleEntries = await prisma.timeEntry.findMany({
    where: {
      driverId: driver.id,
      status: "OPEN",
      clockIn: { lt: staleBefore },
    },
    select: { id: true, clockIn: true, notes: true },
  });

  if (staleEntries.length === 0) return;

  // Each row needs its own clockOut (clockIn + 9h), so they can't collapse into
  // a single updateMany — but they don't need to run one after another either.
  await Promise.all(
    staleEntries.map((entry) =>
      prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          status: "CLOSED",
          clockOut: addHours(entry.clockIn, AUTO_CLOSE_HOURS),
          notes: entry.notes
            ? `${entry.notes}\nAuto-closed: forgot to clock out`
            : "Auto-closed: forgot to clock out",
        },
      })
    )
  );
}

export async function clockInAction(_prevState, formData) {
  void formData;
  const driver = await getCurrentDriver();
  if (!driver) return fail("You're not signed in.");

  await autoCloseStaleEntries();

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
