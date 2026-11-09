import "server-only";
import { createClient } from "@supabase/supabase-js";

// Server-side database access through the Supabase Data API.
//
// SECURITY: this client uses the service-role key, which bypasses row level
// security. That is deliberate. Every table has RLS enabled with no policies
// (see supabase/migrations/20261107000000_move_off_prisma.sql), so the public
// anon key can read nothing, and all access goes through server code that has
// already called requireAdmin() or requireEmployee(). The `server-only` import
// makes the build fail if this module is ever pulled into a client bundle.

let client = null;

/**
 * Lazily created so `next build` works without env vars, and shared across
 * requests: the client holds no per-user state.
 */
export function db() {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      throw new Error(
        "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set."
      );
    }
    client = createClient(url, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false,
      },
    });
  }
  return client;
}

// Columns stored as TIMESTAMP(3) WITHOUT TIME ZONE, holding UTC.
const TIMESTAMP_COLUMNS = new Set([
  "createdAt",
  "updatedAt",
  "reviewedAt",
  "stageChangedAt",
  "scheduledAt",
  "completedAt",
  "paidDate",
  "clockIn",
  "clockOut",
]);

const HAS_OFFSET = /(?:[zZ]|[+-]\d{2}(?::?\d{2})?)$/;

// The Data API returns those columns as "2026-08-07T10:15:00.123", with no
// offset, and `new Date()` would read that as *local* time. The values are UTC,
// so pin them before parsing.
function toDate(value) {
  if (typeof value !== "string") return value;
  return new Date(HAS_OFFSET.test(value) ? value : `${value}Z`);
}

// Converts timestamp columns, including inside embedded relations, to Date
// objects. Callers rely on real Dates (Intl.DateTimeFormat#format, for one,
// throws on a string).
function reviveDates(value) {
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === "object") {
    for (const key of Object.keys(value)) {
      const v = value[key];
      value[key] =
        TIMESTAMP_COLUMNS.has(key) && v != null ? toDate(v) : reviveDates(v);
    }
  }
  return value;
}

function toError(error) {
  // Keep Postgres' error code (e.g. 23505 for a unique violation) so callers
  // can branch on it.
  return Object.assign(new Error(error.message), {
    code: error.code,
    details: error.details,
    hint: error.hint,
  });
}

export const UNIQUE_VIOLATION = "23505";

/**
 * Awaits a query and returns its data, throwing on error.
 *
 * supabase-js reports failures in the result rather than throwing. Every query
 * goes through here so an error can never be mistaken for "no rows" — which
 * matters most in getAuthContext(), where "no Driver row" means "admin".
 */
export async function unwrap(query) {
  const { data, error } = await query;
  if (error) throw toError(error);
  return reviveDates(data);
}

/**
 * Like unwrap(), but also returns the row count. Pass `{ count: "exact" }` to
 * select() on the query.
 */
export async function unwrapWithCount(query) {
  const { data, error, count } = await query;
  if (error) throw toError(error);
  return { rows: reviveDates(data) ?? [], count: count ?? 0 };
}

/**
 * Count only, for queries built with `select(..., { count: "exact", head: true })`.
 */
export async function unwrapCount(query) {
  const { error, count } = await query;
  if (error) throw toError(error);
  return count ?? 0;
}

const PAGE_SIZE = 1000;

/**
 * Fetches every row of an unbounded query.
 *
 * The Data API caps a single response (1000 rows by default), so use this for
 * any query without a natural limit. `build(opts)` must pass `opts` to
 * select() and return a fresh query each call, with a deterministic order —
 * include a unique column such as "id" last.
 */
export async function unwrapAll(build) {
  const first = await unwrapWithCount(
    build({ count: "exact" }).range(0, PAGE_SIZE - 1)
  );
  const rows = first.rows;
  // Paging by the true total rather than "stop on a short page" keeps this
  // correct even if the project's max-rows setting is below PAGE_SIZE.
  while (rows.length < first.count) {
    const page = await unwrap(
      build().range(rows.length, rows.length + PAGE_SIZE - 1)
    );
    if (!page?.length) break;
    rows.push(...page);
  }
  return rows;
}

/**
 * Driver head-counts from driver_counts(), one round trip:
 *   byStatus        { PENDING: 4, APPROVED: 12, ... }
 *   approvedByRole  { driver: 9, manager: 3, ... }  (hired employees only)
 *   total           every Driver row
 */
export async function getDriverCounts() {
  const rows = await unwrap(db().rpc("driver_counts"));
  const byStatus = {};
  const approvedByRole = {};
  let total = 0;
  for (const row of rows ?? []) {
    const n = Number(row.count);
    byStatus[row.status] = (byStatus[row.status] ?? 0) + n;
    if (row.status === "APPROVED") {
      approvedByRole[row.jobRole] = (approvedByRole[row.jobRole] ?? 0) + n;
    }
    total += n;
  }
  return { byStatus, approvedByRole, total };
}

// Escapes a user-supplied term for use as a literal LIKE/ILIKE substring
// inside a PostgREST or() filter. Two layers: LIKE wildcards first, then the
// double-quoting that stops commas and parentheses ending the filter early.
function containsPattern(term) {
  const like = `%${term.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
  return `"${like.replace(/["\\]/g, (c) => `\\${c}`)}"`;
}

/**
 * Builds an or() filter matching `term` as a substring of any of `columns`.
 * Each entry is [column, "ilike" | "like"].
 */
export function orContains(columns, term) {
  const pattern = containsPattern(term);
  return columns.map(([column, op]) => `${column}.${op}.${pattern}`).join(",");
}
