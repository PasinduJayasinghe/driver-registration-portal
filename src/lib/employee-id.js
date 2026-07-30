import { prisma } from "@/lib/prisma";

const ID_PREFIX = "FEN-";
const ID_PAD = 5;

// Allocates the next employee ID from a Postgres sequence.
//
// nextval() is atomic and O(1) — no table scan, and concurrent callers can
// never receive the same value. The sequence is created and seeded above the
// highest existing ID by the 20260731000000_employee_id_sequence migration.
export async function nextEmployeeId() {
  const rows = await prisma.$queryRaw`SELECT nextval('employee_id_seq') AS value`;
  // nextval() returns bigint, which the driver surfaces as a BigInt.
  const value = Number(rows?.[0]?.value ?? 0);
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new Error(`employee_id_seq returned an unusable value: ${value}`);
  }
  return `${ID_PREFIX}${String(value).padStart(ID_PAD, "0")}`;
}

export async function createEmployeeWithAutoId(data) {
  // The sequence guarantees uniqueness, so a single attempt is enough. A P2002
  // here would mean a genuine data problem (e.g. an ID inserted by hand), and
  // is surfaced to the caller rather than silently retried.
  try {
    const employeeId = await nextEmployeeId();
    const created = await prisma.driver.create({
      data: { ...data, employeeId },
    });
    return { ok: true, driver: created };
  } catch (error) {
    return { ok: false, error };
  }
}
