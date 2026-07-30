import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";
import {
  daysInMonth,
  formatTime,
  formatDuration,
  durationMs,
  groupEntriesByDay,
  MONTH_NAMES,
} from "@/lib/time";

const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#191c1d",
  },
  header: {
    borderBottomWidth: 2,
    borderBottomColor: "#a6340f",
    paddingBottom: 8,
    marginBottom: 12,
  },
  brand: {
    fontSize: 18,
    fontWeight: 700,
    color: "#a6340f",
  },
  title: {
    fontSize: 13,
    marginTop: 4,
  },
  subtitle: {
    fontSize: 9,
    color: "#58413b",
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 700,
    marginTop: 12,
    marginBottom: 4,
  },
  table: {
    borderWidth: 1,
    borderColor: "#e0bfb7",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0bfb7",
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f3f4f5",
    borderBottomWidth: 1,
    borderBottomColor: "#e0bfb7",
  },
  cell: {
    padding: 4,
    fontSize: 8,
  },
  cellHeader: {
    padding: 4,
    fontSize: 8,
    fontWeight: 700,
  },
  cellRight: {
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 18,
    left: 36,
    right: 36,
    fontSize: 7,
    color: "#58413b",
    textAlign: "center",
  },
  summaryRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e0bfb7",
  },
  weekend: {
    backgroundColor: "#f3f4f5",
  },
  totalRow: {
    flexDirection: "row",
    backgroundColor: "#f3f4f5",
    fontWeight: 700,
  },
});

function SummaryTable({ employees, entriesByEmployee }) {
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.cellHeader, { width: "16%" }]}>Employee ID</Text>
        <Text style={[styles.cellHeader, { width: "30%" }]}>Name</Text>
        <Text style={[styles.cellHeader, { width: "12%", textAlign: "right" }]}>
          Shifts
        </Text>
        <Text style={[styles.cellHeader, { width: "14%", textAlign: "right" }]}>
          Days
        </Text>
        <Text style={[styles.cellHeader, { width: "14%", textAlign: "right" }]}>
          Total
        </Text>
        <Text style={[styles.cellHeader, { width: "14%", textAlign: "right" }]}>
          Avg / day
        </Text>
      </View>
      {employees.map((emp) => {
        const empEntries = entriesByEmployee.get(emp.id) ?? [];
        const totalMs = empEntries.reduce(
          (sum, e) => sum + (durationMs(e.clockIn, e.clockOut) ?? 0),
          0
        );
        const byDay = groupEntriesByDay(empEntries);
        const avg = byDay.size > 0 ? totalMs / byDay.size : 0;
        return (
          <View key={emp.id} style={styles.summaryRow}>
            <Text style={[styles.cell, { width: "16%" }]}>
              {emp.employeeId}
            </Text>
            <Text style={[styles.cell, { width: "30%" }]}>{emp.fullName}</Text>
            <Text style={[styles.cell, { width: "12%", textAlign: "right" }]}>
              {empEntries.length}
            </Text>
            <Text style={[styles.cell, { width: "14%", textAlign: "right" }]}>
              {byDay.size}
            </Text>
            <Text style={[styles.cell, { width: "14%", textAlign: "right" }]}>
              {formatDuration(totalMs)}
            </Text>
            <Text style={[styles.cell, { width: "14%", textAlign: "right" }]}>
              {byDay.size > 0 ? formatDuration(Math.round(avg)) : "—"}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function DailyTable({ employees, entriesByEmployee, year, month }) {
  const days = daysInMonth(year, month);
  const nameCol = "16%";
  const dayCol = `${Math.max(8, Math.floor(84 / Math.max(1, employees.length)))}%`;
  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.cellHeader, { width: nameCol }]}>Date</Text>
        {employees.map((emp) => (
          <Text
            key={emp.id}
            style={[styles.cellHeader, { width: dayCol, textAlign: "left" }]}
          >
            {emp.fullName}
          </Text>
        ))}
      </View>
      {days.map((d) => {
        const cells = employees.map((emp) => {
          const empEntries = entriesByEmployee.get(emp.id) ?? [];
          const byDay = groupEntriesByDay(empEntries);
          const cell = byDay.get(d.ymd);
          if (!cell) return "—";
          const first = cell.entries[0];
          return `${formatTime(first.clockIn)}${
            first.clockOut ? " – " + formatTime(first.clockOut) : " (open)"
          }\n${formatDuration(cell.totalMs)}`;
        });
        return (
          <View
            key={d.ymd}
            style={[styles.tableRow, d.isWeekend ? styles.weekend : null]}
          >
            <Text style={[styles.cell, { width: nameCol }]}>
              {MONTH_NAMES[month - 1].slice(0, 3)} {d.dayOfMonth}
            </Text>
            {cells.map((c, i) => (
              <Text key={i} style={[styles.cell, { width: dayCol }]}>
                {c}
              </Text>
            ))}
          </View>
        );
      })}
      <View style={styles.totalRow}>
        <Text style={[styles.cell, { width: nameCol }]}>Total</Text>
        {employees.map((emp) => {
          const empEntries = entriesByEmployee.get(emp.id) ?? [];
          const totalMs = empEntries.reduce(
            (sum, e) => sum + (durationMs(e.clockIn, e.clockOut) ?? 0),
            0
          );
          const byDay = groupEntriesByDay(empEntries);
          return (
            <Text key={emp.id} style={[styles.cell, { width: dayCol }]}>
              {formatDuration(totalMs)} ({byDay.size}d)
            </Text>
          );
        })}
      </View>
    </View>
  );
}

export default function TimeReportPdf({ employees, entries, year, month }) {
  const entriesByEmployee = new Map();
  for (const e of employees) entriesByEmployee.set(e.id, []);
  for (const e of entries) {
    const arr = entriesByEmployee.get(e.driverId);
    if (arr) arr.push(e);
  }

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Fenix Cars</Text>
          <Text style={styles.title}>
            Monthly Time Report — {MONTH_NAMES[month - 1]} {year}
          </Text>
          <Text style={styles.subtitle}>
            Office staff & managers · Generated{" "}
            {new Date().toLocaleString("en-GB")}
          </Text>
        </View>

        <Text style={styles.sectionTitle}>Per-employee summary</Text>
        {employees.length === 0 ? (
          <Text style={styles.cell}>No employees to show.</Text>
        ) : (
          <SummaryTable
            employees={employees}
            entriesByEmployee={entriesByEmployee}
          />
        )}

        <Text style={styles.sectionTitle}>
          Day-by-day — {MONTH_NAMES[month - 1]} {year}
        </Text>
        {employees.length === 0 ? (
          <Text style={styles.cell}>No data.</Text>
        ) : (
          <DailyTable
            employees={employees}
            entriesByEmployee={entriesByEmployee}
            year={year}
            month={month}
          />
        )}

        <Text
          style={styles.footer}
          render={({ pageNumber, totalPages }) =>
            `Fenix Cars · Page ${pageNumber} of ${totalPages}`
          }
          fixed
        />
      </Page>
    </Document>
  );
}
