import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

// Roles that are allowed to clock in/out and use the employee portal.
export const CLOCKABLE_ROLES = new Set(["sri_lankan_staff", "manager"]);

// Who counts as an admin?
//
// Admin accounts are created directly in Supabase (Dashboard → Authentication)
// and are NOT linked to a Driver row. Employee logins are always created through
// the "Set up login" button in /admin/employees, which writes Driver.userId.
//
// So: an authenticated user with no Driver row is an admin; one with a Driver row
// is staff and must never reach /admin. This keeps Supabase user creation exactly
// as it is today — no extra table and no metadata to maintain.
//
// SECURITY: every admin server action and admin-only route must call
// requireAdmin(). The proxy redirect is a UX convenience, not an authorization
// boundary — server actions are directly invocable and do not pass through it.

// PERFORMANCE: both lookups below are wrapped in React `cache()`, which dedupes
// them per request. A single navigation previously resolved the same identity
// several times over — the layout called getAuthContext(), the page called
// supabase.auth.getUser() and re-queried the driver row itself, and any server
// action reached for it again. Each of those was a round trip to Supabase, so
// the duplicates cost real wall-clock time rather than just being untidy.
//
// cache() is per-request and never shared between users, so this is safe for
// auth data: two different visitors can never observe each other's context.

/**
 * Returns the current Supabase user, or null when signed out.
 * Deduped per request.
 */
export const getCurrentUser = cache(async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/**
 * Resolves the signed-in user to { user, driver, isAdmin }.
 * `driver` is null for admins. Deduped per request.
 */
export const getAuthContext = cache(async function getAuthContext() {
  const user = await getCurrentUser();
  if (!user) return { user: null, driver: null, isAdmin: false };

  const driver = await prisma.driver.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      fullName: true,
      employeeId: true,
      jobRole: true,
      status: true,
    },
  });

  return { user, driver, isAdmin: driver === null };
});

/**
 * Throws unless the caller is an admin. Returns the identifier to record as the
 * reviewer. Use this at the top of every admin server action.
 */
export async function requireAdmin() {
  const { user, isAdmin } = await getAuthContext();
  if (!user) {
    throw new Error("Not authenticated.");
  }
  if (!isAdmin) {
    throw new Error("Not authorized. This action requires an admin account.");
  }
  return user.email ?? user.id;
}

/**
 * Throws unless the caller is an active employee with clock access.
 * Returns the driver record.
 */
export async function requireEmployee() {
  const { user, driver } = await getAuthContext();
  if (!user) throw new Error("Not authenticated.");
  if (!driver) throw new Error("Not an employee account.");
  if (driver.status !== "APPROVED") throw new Error("Account is not active.");
  if (!CLOCKABLE_ROLES.has(driver.jobRole)) {
    throw new Error("This role does not have clock access.");
  }
  return driver;
}
