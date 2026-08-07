import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Tabs from "@/components/ui/Tabs";
import Pill, { StatusPill, InterviewOutcomePill } from "@/components/ui/Pill";
import PipelineActions from "@/components/admin/PipelineActions";
import { formatDateTime, toOfficeLocalInput } from "@/lib/time";
import {
  PIPELINE_ORDER,
  ACTIVE_STAGES,
  STAGE_META,
  STAGES,
  INTERVIEW_MODE_LABELS,
  daysWaiting,
  isStalled,
  interviewTiming,
} from "@/lib/pipeline";

export const dynamic = "force-dynamic";

const JOB_ROLE_LABELS = {
  driver: "Driver",
  sri_lankan_staff: "Sri Lankan Staff",
  manager: "Manager",
};

const LICENCE_TYPE_LABELS = {
  full_uk: "Full UK",
  provisional_uk: "Provisional UK",
  eu: "EU",
  international: "International",
  other: "Other",
};

// Tabs follow the funnel, with "All" appended. Tab keys are lowercased stage
// names so the URL reads /admin/requests?tab=shortlisted.
const STAGE_TABS = [
  ...PIPELINE_ORDER.map((status) => ({
    key: status.toLowerCase(),
    label: STAGE_META[status].short,
    status,
  })),
  { key: "all", label: "All", status: null },
];

function DriverDetails({ driver }) {
  const hasAny =
    driver.nationality ||
    driver.yearsOfExperience != null ||
    driver.licenceNumber ||
    driver.licenceType;

  if (!hasAny) {
    return <span className="text-on-surface-variant/60">—</span>;
  }

  return (
    <div className="flex flex-col gap-0.5 text-label-sm">
      {driver.nationality ? <div>{driver.nationality}</div> : null}
      {driver.yearsOfExperience != null ? (
        <div>
          {driver.yearsOfExperience}{" "}
          {driver.yearsOfExperience === 1 ? "year" : "years"} experience
        </div>
      ) : null}
      {driver.licenceNumber ? (
        <div className="font-mono text-on-surface-variant/80">
          {driver.licenceNumber}
        </div>
      ) : null}
      {driver.licenceType ? (
        <div className="text-on-surface-variant/80">
          {LICENCE_TYPE_LABELS[driver.licenceType] ?? driver.licenceType}
        </div>
      ) : null}
    </div>
  );
}

// Stage plus how long they have been sitting in it. The waiting time is the
// part that makes this actionable — a stage on its own doesn't tell you whether
// anyone is being forgotten.
function StageCell({ driver, now }) {
  const since = driver.stageChangedAt ?? driver.createdAt;
  const days = daysWaiting(since, now);
  const stalled = isStalled(driver.status, since, now);
  const meta = STAGE_META[driver.status];

  return (
    <div className="flex flex-col gap-1 items-start">
      <StatusPill status={driver.status} />
      {days != null && meta?.nextAction ? (
        <span
          className={`text-label-sm ${
            stalled ? "text-error font-semibold" : "text-on-surface-variant/80"
          }`}
        >
          {stalled ? "⚠ " : ""}
          {days === 0 ? "since today" : `waiting ${days}d`}
        </span>
      ) : null}
    </div>
  );
}

function InterviewCell({ interview, status, now }) {
  if (!interview) {
    return <span className="text-on-surface-variant/60">—</span>;
  }

  const timing =
    status === STAGES.INTERVIEW_SCHEDULED
      ? interviewTiming(interview.scheduledAt, now)
      : null;

  return (
    <div className="flex flex-col gap-1 items-start text-label-sm">
      <div className="text-on-surface font-medium">
        {formatDateTime(interview.scheduledAt)}
      </div>
      <div className="text-on-surface-variant/80">
        {INTERVIEW_MODE_LABELS[interview.mode] ?? interview.mode}
        {interview.durationMins ? ` · ${interview.durationMins}m` : ""}
      </div>
      {interview.location ? (
        <div className="text-on-surface-variant/80">{interview.location}</div>
      ) : null}
      {interview.interviewerEmail ? (
        <div className="text-on-surface-variant/70">
          with {interview.interviewerEmail}
        </div>
      ) : null}

      {timing === "overdue" ? (
        <Pill tone="negative">Outcome overdue</Pill>
      ) : timing === "today" || timing === "in_progress" ? (
        <Pill tone="warning">Today</Pill>
      ) : null}

      {/* Shown at every stage past the interview, not just INTERVIEWED — how
          someone did still matters once they've been hired or rejected. */}
      {interview.outcome !== "PENDING" ? (
        <InterviewOutcomePill outcome={interview.outcome} />
      ) : null}
    </div>
  );
}

// Clickable funnel across the top. Doubles as navigation and as the at-a-glance
// answer to "where is everyone right now".
function FunnelBar({ countByStatus, activeKey }) {
  const active = ACTIVE_STAGES.reduce(
    (sum, s) => sum + (countByStatus[s] ?? 0),
    0
  );

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 p-4">
      <div className="flex items-baseline justify-between gap-3 mb-3">
        <h2 className="text-headline-md text-on-surface">Pipeline</h2>
        <span className="text-label-sm text-on-surface-variant">
          {active} candidate{active === 1 ? "" : "s"} in progress
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {PIPELINE_ORDER.map((status) => {
          const meta = STAGE_META[status];
          const key = status.toLowerCase();
          const isActive = key === activeKey;
          return (
            <Link
              key={status}
              href={`/admin/requests?tab=${key}`}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-col gap-1 px-3 py-3 rounded-xl border transition-colors ${
                isActive
                  ? "border-primary/40 bg-primary-container/10"
                  : "border-outline-variant/40 hover:bg-surface-container/60"
              }`}
            >
              <span className="inline-flex items-center gap-1.5 text-label-sm text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px]">
                  {meta.icon}
                </span>
                {meta.short}
              </span>
              <span className="text-title-lg font-bold text-on-surface tabular">
                {countByStatus[status] ?? 0}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function RequestsPage({ searchParams }) {
  const params = (await searchParams) ?? {};
  const rawTab = typeof params.tab === "string" ? params.tab : "pending";
  const activeTab = STAGE_TABS.find((t) => t.key === rawTab) ?? STAGE_TABS[0];

  const page = Math.max(1, Number(params.page) || 1);
  const PAGE_SIZE = 100;

  const where = activeTab.status ? { status: activeTab.status } : {};
  const [drivers, counts] = await Promise.all([
    prisma.driver.findMany({
      where,
      // Within a stage, the longest-waiting candidate is the most urgent, so
      // ordering is oldest-first by stage entry. Falls back to createdAt for
      // rows that predate the pipeline and have no stageChangedAt.
      orderBy: activeTab.status
        ? [{ stageChangedAt: "asc" }, { createdAt: "asc" }]
        : [{ createdAt: "desc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        employeeId: true,
        contactNumber: true,
        email: true,
        address: true,
        jobRole: true,
        status: true,
        createdAt: true,
        stageChangedAt: true,
        reviewedByEmail: true,
        nationality: true,
        yearsOfExperience: true,
        licenceNumber: true,
        licenceType: true,
        // Most recently created interview is the current one. Ordering by
        // createdAt rather than scheduledAt matters after a reschedule, where a
        // cancelled slot can sit later in the calendar than the live one.
        interviews: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: {
            id: true,
            scheduledAt: true,
            durationMins: true,
            mode: true,
            location: true,
            interviewerEmail: true,
            outcome: true,
            notes: true,
          },
        },
      },
    }),
    prisma.driver.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const countByStatus = counts.reduce((acc, c) => {
    acc[c.status] = c._count._all;
    return acc;
  }, {});
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);

  const totalMatching = activeTab.status
    ? countByStatus[activeTab.status] ?? 0
    : total;
  const totalPages = Math.max(1, Math.ceil(totalMatching / PAGE_SIZE));

  // One clock reading for the whole render so every "waiting Nd" on the page is
  // measured against the same instant.
  const now = new Date();

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const rows = drivers.map((d) => {
    const latest = d.interviews[0] ?? null;
    return {
      driver: d,
      interview: latest,
      // Pre-serialised for the client component: Dates can't cross the boundary,
      // and the datetime-local default has to be office-local.
      interviewForClient: latest
        ? {
            id: latest.id,
            durationMins: latest.durationMins,
            mode: latest.mode,
            location: latest.location,
            interviewerEmail: latest.interviewerEmail,
            notes: latest.notes,
            scheduledAtInput: toOfficeLocalInput(latest.scheduledAt),
          }
        : null,
    };
  });

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-headline-lg-mobile md:text-headline-lg text-on-surface">
          Recruitment Pipeline
        </h1>
        <p className="text-body-lg text-on-surface-variant">
          Track every applicant from registration through interview to hire.
          Only candidates you hire become employees.
        </p>
      </div>

      <FunnelBar countByStatus={countByStatus} activeKey={activeTab.key} />

      <div className="bg-surface-container-lowest rounded-2xl shadow-[var(--shadow-e1)] border border-outline-variant/30 flex flex-col">
        <Tabs
          activeKey={activeTab.key}
          layoutId="requests-tab"
          tabs={STAGE_TABS.map((tab) => ({
            key: tab.key,
            label: tab.label,
            count: tab.status === null ? total : countByStatus[tab.status] ?? 0,
            href: `/admin/requests?tab=${tab.key}`,
          }))}
        />

        {activeTab.status && STAGE_META[activeTab.status]?.nextAction ? (
          <div className="px-6 py-3 border-b border-outline-variant/30 bg-surface-container-low/50 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
              lightbulb
            </span>
            <span className="text-label-md text-on-surface-variant">
              {STAGE_META[activeTab.status].description}{" "}
              <strong className="text-on-surface">
                Next: {STAGE_META[activeTab.status].nextAction}.
              </strong>
            </span>
          </div>
        ) : null}

        <div className="overflow-x-auto">
          {rows.length === 0 ? (
            <div className="p-12 text-center text-on-surface-variant">
              No candidates at the {activeTab.label.toLowerCase()} stage.
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>Contact</th>
                  <th>Role</th>
                  <th>Driver Details</th>
                  <th>Applied</th>
                  <th>Stage</th>
                  <th>Interview</th>
                  <th className="num">Actions</th>
                </tr>
              </thead>
              <tbody className="text-body-md">
                {rows.map(({ driver, interview, interviewForClient }) => (
                  <tr key={driver.id}>
                    <td className="text-on-surface font-medium">
                      <div>{driver.fullName}</div>
                      <div className="text-label-sm text-on-surface-variant font-mono">
                        {driver.employeeId}
                      </div>
                      {driver.email ? (
                        <div className="text-label-sm text-on-surface-variant/80">
                          {driver.email}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-on-surface-variant">
                      <div>{driver.contactNumber}</div>
                      {driver.address ? (
                        <div className="text-label-sm text-on-surface-variant/80">
                          {driver.address}
                        </div>
                      ) : null}
                    </td>
                    <td className="text-on-surface-variant">
                      {JOB_ROLE_LABELS[driver.jobRole] ?? driver.jobRole}
                    </td>
                    <td className="text-on-surface-variant">
                      <DriverDetails driver={driver} />
                    </td>
                    <td className="text-on-surface-variant">
                      {dateFmt.format(driver.createdAt)}
                    </td>
                    <td>
                      <StageCell driver={driver} now={now} />
                      {driver.reviewedByEmail ? (
                        <div className="text-label-sm text-on-surface-variant mt-1">
                          by {driver.reviewedByEmail}
                        </div>
                      ) : null}
                    </td>
                    <td>
                      <InterviewCell
                        interview={interview}
                        status={driver.status}
                        now={now}
                      />
                    </td>
                    <td className="text-right">
                      <PipelineActions
                        driver={{
                          id: driver.id,
                          fullName: driver.fullName,
                          employeeId: driver.employeeId,
                          status: driver.status,
                        }}
                        interview={interviewForClient}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 ? (
          <div className="p-4 border-t border-outline-variant/30 flex items-center justify-between gap-3">
            <span className="text-label-sm text-on-surface-variant">
              Page {page} of {totalPages} · {totalMatching} candidates
            </span>
            <div className="flex items-center gap-2">
              {page > 1 ? (
                <a
                  href={`/admin/requests?tab=${activeTab.key}${
                    page - 1 > 1 ? `&page=${page - 1}` : ""
                  }`}
                  className="px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  Previous
                </a>
              ) : null}
              {page < totalPages ? (
                <a
                  href={`/admin/requests?tab=${activeTab.key}&page=${page + 1}`}
                  className="px-3 py-1.5 rounded-full border border-outline text-on-surface-variant text-label-sm font-semibold hover:bg-surface-container transition-colors"
                >
                  Next
                </a>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
