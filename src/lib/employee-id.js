import { prisma } from "@/lib/prisma";

const ID_PREFIX = "FEN-";
const ID_PAD = 5;

export async function nextEmployeeId() {
  const rows = await prisma.$queryRaw`
    SELECT COALESCE(MAX(CAST(SUBSTRING("employeeId" FROM ${ID_PREFIX.length + 1}) AS INTEGER)), 0) AS max
    FROM "Driver"
    WHERE "employeeId" ~ ${`^${ID_PREFIX}[0-9]+$`}
  `;
  const max = Number(rows?.[0]?.max ?? 0);
  return `${ID_PREFIX}${String(max + 1).padStart(ID_PAD, "0")}`;
}

export async function createEmployeeWithAutoId(data) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const employeeId = await nextEmployeeId();
    try {
      const created = await prisma.driver.create({
        data: { ...data, employeeId },
      });
      return { ok: true, driver: created };
    } catch (error) {
      lastError = error;
      if (error?.code !== "P2002") {
        throw error;
      }
    }
  }
  return { ok: false, error: lastError };
}
