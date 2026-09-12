import { defineTool } from "eve/tools";
import z from "zod";
import {
  calculateSeverityScore,
  grievances,
  isOverdue,
} from "../lib/grievance-data.js";

export default defineTool({
  description:
    "Analyze the grievance dataset to identify the most serious unresolved cases, longest-waiting cases, overdue cases, mass-impact cases, SLA risks, escalation candidates, or the priority of a newly submitted complaint.",
  inputSchema: z.object({
    analysis: z.enum([
      "most-serious",
      "longest-waiting",
      "overdue",
      "mass-impact",
      "sla-risk",
      "escalation-candidates",
      "new-case-priority",
    ]),
    limit: z.number().int().min(1).max(20).optional(),
    complaint: z.string().optional(),
  }),
  async execute(input) {
    const limit = input.limit ?? 5;

    if (input.analysis === "new-case-priority") {
      const complaint = (input.complaint ?? "").trim();

      if (!complaint) {
        return {
          found: false,
          message:
            "A complaint is required for new-case-priority analysis.",
        };
      }

      const text = complaint.toLowerCase();

      const criticalWords = [
        "harassment",
        "assault",
        "threat",
        "unsafe",
        "violence",
        "discrimination",
      ];

      const highWords = [
        "scholarship",
        "fees",
        "exam",
        "result",
        "payment",
        "hostel",
        "water",
        "power",
      ];

      const massImpactWords = [
        "students",
        "everyone",
        "many",
        "whole block",
        "entire",
        "campus",
        "class",
      ];

      const critical = criticalWords.some((word) =>
        text.includes(word),
      );

      const high = highWords.some((word) => text.includes(word));
      const massImpact = massImpactWords.some((word) =>
        text.includes(word),
      );

      const sensitive = critical;

      let priority = "Low";

      if (critical) {
        priority = "Critical";
      } else if (high && massImpact) {
        priority = "Critical";
      } else if (high) {
        priority = "High";
      } else if (massImpact) {
        priority = "High";
      } else if (complaint.length > 40) {
        priority = "Medium";
      }

      const score =
        priority === "Critical"
          ? 95
          : priority === "High"
            ? 78
            : priority === "Medium"
              ? 48
              : 25;

      return {
        found: true,
        analysis: "new-case-priority",
        priority,
        urgencyScore: score,
        signals: {
          sensitive,
          likelyMassImpact: massImpact,
          likelyHighRiskCategory: high,
        },
        reasoning: [
          sensitive
            ? "Sensitive conduct or safety language detected."
            : null,
          massImpact
            ? "Complaint appears to affect multiple students."
            : null,
          high
            ? "Complaint contains a high-risk institutional category."
            : null,
          priority === "Medium"
            ? "Complaint warrants routine but timely review."
            : null,
          priority === "Low"
            ? "No major urgency indicators were detected."
            : null,
        ].filter(Boolean),
      };
    }

    const open = grievances.filter(
      (item) =>
        item.status !== "Resolved" && item.status !== "Closed",
    );

    if (input.analysis === "most-serious") {
      const ranked = [...open]
        .sort(
          (a, b) =>
            calculateSeverityScore(b) - calculateSeverityScore(a),
        )
        .slice(0, limit);

      return {
        analysis: input.analysis,
        count: ranked.length,
        results: ranked.map((item) => ({
          grievanceId: item.grievanceId,
          title: item.title,
          priority: item.priority,
          severityScore: calculateSeverityScore(item),
          status: item.status,
          department: item.department,
          affectedStudentCount: item.affectedStudentCount,
          overdue: isOverdue(item),
          sensitive: item.sensitive,
          reasoning: [
            `${item.priority} priority`,
            item.affectedStudentCount > 20
              ? `Affects ${item.affectedStudentCount} students`
              : "Individual student impact",
            isOverdue(item)
              ? "SLA has been breached"
              : "Within current SLA",
            item.sensitive
              ? "Sensitive case requiring human review"
              : "No sensitive-case flag",
          ],
        })),
      };
    }

    if (input.analysis === "longest-waiting") {
      const ranked = [...open]
        .sort(
          (a, b) =>
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime(),
        )
        .slice(0, limit);

      return {
        analysis: input.analysis,
        count: ranked.length,
        results: ranked.map((item) => ({
          grievanceId: item.grievanceId,
          title: item.title,
          submittedAt: item.submittedAt,
          waitingHours: Math.round(
            (Date.now() -
              new Date(item.submittedAt).getTime()) /
              (1000 * 60 * 60),
          ),
          status: item.status,
          priority: item.priority,
          department: item.department,
          overdue: isOverdue(item),
        })),
      };
    }

    if (input.analysis === "overdue") {
      const ranked = open
        .filter(isOverdue)
        .sort(
          (a, b) =>
            new Date(a.submittedAt).getTime() -
            new Date(b.submittedAt).getTime(),
        )
        .slice(0, limit);

      return {
        analysis: input.analysis,
        count: ranked.length,
        results: ranked.map((item) => ({
          grievanceId: item.grievanceId,
          title: item.title,
          department: item.department,
          priority: item.priority,
          slaHours: item.slaHours,
          submittedAt: item.submittedAt,
          overdue: true,
        })),
      };
    }

    if (input.analysis === "mass-impact") {
      const ranked = [...grievances]
        .filter((item) => item.affectedStudentCount > 1)
        .sort(
          (a, b) =>
            b.affectedStudentCount - a.affectedStudentCount,
        )
        .slice(0, limit);

      return {
        analysis: input.analysis,
        count: ranked.length,
        results: ranked.map((item) => ({
          grievanceId: item.grievanceId,
          title: item.title,
          department: item.department,
          status: item.status,
          priority: item.priority,
          affectedStudentCount: item.affectedStudentCount,
        })),
      };
    }

    if (input.analysis === "sla-risk") {
      const ranked = [...open]
        .map((item) => {
          const elapsed =
            (Date.now() -
              new Date(item.submittedAt).getTime()) /
            (1000 * 60 * 60);

          const percentage = elapsed / item.slaHours;

          return {
            item,
            elapsed,
            percentage,
          };
        })
        .filter((row) => row.percentage >= 0.5)
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, limit);

      return {
        analysis: input.analysis,
        count: ranked.length,
        results: ranked.map((row) => ({
          grievanceId: row.item.grievanceId,
          title: row.item.title,
          department: row.item.department,
          priority: row.item.priority,
          elapsedHours: Math.round(row.elapsed),
          slaHours: row.item.slaHours,
          slaUtilizationPercent: Math.round(
            row.percentage * 100,
          ),
          overdue: row.percentage > 1,
        })),
      };
    }

    const candidates = open
      .filter(
        (item) =>
          isOverdue(item) ||
          item.priority === "Critical" ||
          item.priority === "High" ||
          item.sensitive ||
          item.affectedStudentCount >= 25,
      )
      .sort(
        (a, b) =>
          calculateSeverityScore(b) - calculateSeverityScore(a),
      )
      .slice(0, limit);

    return {
      analysis: "escalation-candidates",
      count: candidates.length,
      results: candidates.map((item) => ({
        grievanceId: item.grievanceId,
        title: item.title,
        department: item.department,
        status: item.status,
        priority: item.priority,
        sensitive: item.sensitive,
        affectedStudentCount: item.affectedStudentCount,
        overdue: isOverdue(item),
        severityScore: calculateSeverityScore(item),
        escalationReasons: [
          item.priority === "Critical"
            ? "Critical priority"
            : null,
          item.priority === "High"
            ? "High priority"
            : null,
          item.sensitive
            ? "Sensitive conduct case"
            : null,
          isOverdue(item)
            ? "SLA breached"
            : null,
          item.affectedStudentCount >= 25
            ? `Affects ${item.affectedStudentCount} students`
            : null,
        ].filter(Boolean),
      })),
    };
  },
});
