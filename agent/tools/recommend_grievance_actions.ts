import { defineTool } from "eve/tools";
import z from "zod";
import {
  grievances,
  isOverdue,
  calculateSeverityScore,
} from "../lib/grievance-data.js";

export default defineTool({
  description:
    "Generate actionable management recommendations from the current grievance environment. Identify immediate actions, institutional risks, recurring operational problems, overloaded departments, and cases needing escalation.",
  inputSchema: z.object({
    scope: z.enum([
      "institution",
      "department",
      "grievance",
    ]).optional(),
    department: z.string().optional(),
    grievanceId: z.string().optional(),
  }),
  async execute(input) {
    if (input.scope === "grievance") {
      const grievance = grievances.find(
        (item) =>
          item.grievanceId.toLowerCase() ===
          input.grievanceId?.trim().toLowerCase(),
      );

      if (!grievance) {
        return {
          found: false,
          message: "The requested grievance was not found.",
        };
      }

      const overdue = isOverdue(grievance);
      const recommendations: string[] = [];

      if (grievance.sensitive) {
        recommendations.push(
          "Route immediately to authorized human review.",
        );
      }

      if (overdue) {
        recommendations.push(
          "Escalate because the grievance has breached its SLA.",
        );
      }

      if (grievance.affectedStudentCount >= 25) {
        recommendations.push(
          "Treat as a mass-impact operational issue and coordinate a broader response.",
        );
      }

      if (grievance.priority === "Critical") {
        recommendations.push(
          "Assign an executive owner and review progress frequently.",
        );
      }

      if (recommendations.length === 0) {
        recommendations.push(
          "Continue normal departmental handling while monitoring the case against its SLA.",
        );
      }

      return {
        found: true,
        grievanceId: grievance.grievanceId,
        currentStatus: grievance.status,
        priority: grievance.priority,
        department: grievance.department,
        overdue,
        recommendations,
      };
    }

    let dataset = [...grievances];

    if (input.scope === "department" && input.department) {
      dataset = dataset.filter(
        (item) =>
          item.department.toLowerCase() ===
          input.department!.toLowerCase(),
      );
    }

    const open = dataset.filter(
      (item) =>
        item.status !== "Resolved" &&
        item.status !== "Closed",
    );

    const overdue = open.filter(isOverdue);

    const critical = open.filter(
      (item) => item.priority === "Critical",
    );

    const massImpact = open.filter(
      (item) => item.affectedStudentCount >= 25,
    );

    const sensitive = open.filter(
      (item) => item.sensitive,
    );

    const departmentCounts = new Map<string, number>();

    for (const item of open) {
      departmentCounts.set(
        item.department,
        (departmentCounts.get(item.department) ?? 0) + 1,
      );
    }

    const overloadedDepartments = [
      ...departmentCounts.entries(),
    ]
      .map(([department, openCases]) => ({
        department,
        openCases,
      }))
      .sort((a, b) => b.openCases - a.openCases);

    const escalationCandidates = [...open]
      .filter(
        (item) =>
          isOverdue(item) ||
          item.priority === "Critical" ||
          item.sensitive ||
          item.affectedStudentCount >= 25,
      )
      .sort(
        (a, b) =>
          calculateSeverityScore(b) -
          calculateSeverityScore(a),
      )
      .slice(0, 8);

    const recommendations: string[] = [];

    if (critical.length > 0) {
      recommendations.push(
        `Immediately review ${critical.length} critical open grievance${critical.length === 1 ? "" : "s"}.`,
      );
    }

    if (overdue.length > 0) {
      recommendations.push(
        `Escalate ${overdue.length} overdue grievance${overdue.length === 1 ? "" : "s"} and assign explicit owners.`,
      );
    }

    if (massImpact.length > 0) {
      recommendations.push(
        `${massImpact.length} open case${massImpact.length === 1 ? "" : "s"} affect large groups of students; coordinate institution-level mitigation.`,
      );
    }

    if (sensitive.length > 0) {
      recommendations.push(
        `${sensitive.length} sensitive case${sensitive.length === 1 ? "" : "s"} require confidential human oversight.`,
      );
    }

    const topDepartment = overloadedDepartments[0];

    if (topDepartment) {
      recommendations.push(
        `${topDepartment.department} currently carries the largest open-case workload with ${topDepartment.openCases} cases.`,
      );
    }

    if (recommendations.length === 0) {
      recommendations.push(
        "Continue normal monitoring while maintaining SLA oversight.",
      );
    }

    return {
      found: true,
      scope: input.scope ?? "institution",
      summary: {
        totalCases: dataset.length,
        openCases: open.length,
        overdueCases: overdue.length,
        criticalCases: critical.length,
        massImpactCases: massImpact.length,
        sensitiveCases: sensitive.length,
      },
      overloadedDepartments,
      escalationCandidates: escalationCandidates.map(
        (item) => ({
          grievanceId: item.grievanceId,
          title: item.title,
          department: item.department,
          priority: item.priority,
          overdue: isOverdue(item),
          affectedStudentCount:
            item.affectedStudentCount,
          severityScore: calculateSeverityScore(item),
        }),
      ),
      recommendations,
    };
  },
});
