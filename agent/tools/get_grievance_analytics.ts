import { defineTool } from "eve/tools";
import z from "zod";
import {
  calculateWaitingHours,
  departments,
  grievances,
} from "../lib/grievance-data.js";

export default defineTool({
  description:
    "Calculate institutional grievance analytics including department complaint volume, resolution speed, monthly trends, recurring issues, and department performance.",
  inputSchema: z.object({
    metric: z.enum([
      "department-volume",
      "resolution-speed",
      "monthly-trend",
      "recurring-issues",
      "department-performance",
      "all",
    ]),
    months: z.number().int().min(1).max(12).optional(),
  }),
  async execute(input) {
    const metric = input.metric;

    if (
      metric === "department-volume" ||
      metric === "department-performance" ||
      metric === "all"
    ) {
      const volume = new Map<string, number>();

      for (const item of grievances) {
        volume.set(
          item.department,
          (volume.get(item.department) ?? 0) + 1,
        );
      }

      const departmentVolume = [...volume.entries()]
        .map(([department, count]) => ({
          department,
          complaintCount: count,
        }))
        .sort((a, b) => b.complaintCount - a.complaintCount);

      if (metric === "department-volume") {
        return {
          metric,
          results: departmentVolume,
          highestVolumeDepartment: departmentVolume[0] ?? null,
        };
      }

      if (metric === "department-performance") {
        const performance = departments.map((department) => {
          const departmentCases = grievances.filter(
            (item) =>
              item.department === department.department,
          );

          const resolved = departmentCases.filter(
            (item) =>
              item.status === "Resolved" ||
              item.status === "Closed",
          );

          const averageResolutionHours =
            resolved.length === 0
              ? null
              : Math.round(
                  resolved.reduce(
                    (sum, item) =>
                      sum + calculateWaitingHours(item),
                    0,
                  ) / resolved.length,
                );

          const overdueCount = departmentCases.filter(
            (item) =>
              item.status !== "Resolved" &&
              item.status !== "Closed" &&
              calculateWaitingHours(item) > item.slaHours,
          ).length;

          return {
            department: department.department,
            complaintCount: departmentCases.length,
            resolvedCount: resolved.length,
            openCount:
              departmentCases.length - resolved.length,
            averageResolutionHours,
            overdueCount,
          };
        });

        return {
          metric,
          results: performance.sort(
            (a, b) =>
              (a.averageResolutionHours ?? 99999) -
              (b.averageResolutionHours ?? 99999),
          ),
        };
      }

      // For "all", continue and build every metric.
    }

    if (metric === "resolution-speed") {
      const resolvedByDepartment = departments.map(
        (department) => {
          const resolved = grievances.filter(
            (item) =>
              item.department === department.department &&
              (item.status === "Resolved" ||
                item.status === "Closed") &&
              item.resolvedAt,
          );

          const averageHours =
            resolved.length === 0
              ? null
              : Math.round(
                  resolved.reduce(
                    (sum, item) =>
                      sum + calculateWaitingHours(item),
                    0,
                  ) / resolved.length,
                );

          return {
            department: department.department,
            resolvedCases: resolved.length,
            averageResolutionHours: averageHours,
          };
        },
      );

      return {
        metric,
        results: resolvedByDepartment.sort(
          (a, b) =>
            (a.averageResolutionHours ?? 99999) -
            (b.averageResolutionHours ?? 99999),
        ),
      };
    }

    if (metric === "monthly-trend") {
      const months = input.months ?? 4;
      const counts = new Map<string, number>();

      for (const item of grievances) {
        const month = item.submittedAt.slice(0, 7);

        counts.set(month, (counts.get(month) ?? 0) + 1);
      }

      const trend = [...counts.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-months)
        .map(([month, complaintCount]) => ({
          month,
          complaintCount,
        }));

      const first = trend[0]?.complaintCount ?? 0;
      const last =
        trend[trend.length - 1]?.complaintCount ?? 0;

      return {
        metric,
        results: trend,
        changeFromFirstToLast: last - first,
        percentageChange:
          first === 0
            ? null
            : Math.round(((last - first) / first) * 100),
      };
    }

    if (metric === "recurring-issues") {
      const buckets = new Map<
        string,
        {
          count: number;
          departments: Set<string>;
          affectedStudents: number;
        }
      >();

      const keywordGroups: Record<string, string[]> = {
        Scholarship: [
          "scholarship",
          "disbursement",
          "renewal",
          "award",
        ],
        Examinations: [
          "exam",
          "examination",
          "result",
          "script",
          "timetable",
          "appeal",
        ],
        Facilities: [
          "lighting",
          "water",
          "leak",
          "air-conditioning",
          "maintenance",
        ],
        Hostel: [
          "hostel",
          "residence",
          "power",
          "hot-water",
        ],
        Transport: [
          "shuttle",
          "transport",
          "bus",
        ],
        Technology: [
          "portal",
          "login",
          "platform",
          "technology",
        ],
        Finance: [
          "fee",
          "fees",
          "balance",
          "payment",
          "charge",
        ],
      };

      for (const item of grievances) {
        const text =
          `${item.title} ${item.description}`.toLowerCase();

        for (const [group, keywords] of Object.entries(
          keywordGroups,
        )) {
          if (
            keywords.some((keyword) =>
              text.includes(keyword),
            )
          ) {
            const existing = buckets.get(group) ?? {
              count: 0,
              departments: new Set<string>(),
              affectedStudents: 0,
            };

            existing.count += 1;
            existing.departments.add(item.department);
            existing.affectedStudents +=
              item.affectedStudentCount;

            buckets.set(group, existing);
          }
        }
      }

      const recurringIssues = [...buckets.entries()]
        .map(([issue, value]) => ({
          issue,
          complaintCount: value.count,
          departments: [...value.departments],
          affectedStudentCount: value.affectedStudents,
        }))
        .sort(
          (a, b) =>
            b.complaintCount - a.complaintCount,
        );

      return {
        metric,
        results: recurringIssues,
      };
    }

    // metric === "all"
    const departmentVolume = new Map<string, number>();

    for (const item of grievances) {
      departmentVolume.set(
        item.department,
        (departmentVolume.get(item.department) ?? 0) + 1,
      );
    }

    const resolved = grievances.filter(
      (item) =>
        item.status === "Resolved" ||
        item.status === "Closed",
    );

    const monthly = new Map<string, number>();

    for (const item of grievances) {
      const month = item.submittedAt.slice(0, 7);
      monthly.set(
        month,
        (monthly.get(month) ?? 0) + 1,
      );
    }

    const openCount = grievances.filter(
      (item) =>
        item.status !== "Resolved" &&
        item.status !== "Closed",
    ).length;

    return {
      metric: "all",
      totals: {
        grievances: grievances.length,
        open: openCount,
        resolved: resolved.length,
      },
      departmentVolume: [...departmentVolume.entries()]
        .map(([department, count]) => ({
          department,
          complaintCount: count,
        }))
        .sort((a, b) => b.complaintCount - a.complaintCount),
      monthlyTrend: [...monthly.entries()]
        .sort(([a], [b]) => a.localeCompare(b)),
      resolutionSpeed: {
        averageResolutionHours:
          resolved.length === 0
            ? null
            : Math.round(
                resolved.reduce(
                  (sum, item) =>
                    sum + calculateWaitingHours(item),
                  0,
                ) / resolved.length,
              ),
      },
    };
  },
});
