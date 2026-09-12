import { defineTool } from "eve/tools";
import z from "zod";
import {
  calculateAgeHours,
  calculateWaitingHours,
  grievances,
  isOverdue,
} from "../lib/grievance-data.js";

export default defineTool({
  description:
    "Retrieve authoritative context for a student grievance or student. Use this when the user asks about a specific grievance, status, department, student, timeline, affected students, assignment, or case history.",
  inputSchema: z.object({
    grievanceId: z.string().optional(),
    studentId: z.string().optional(),
    query: z.string().optional(),
  }),
  async execute(input) {
    const normalizedId = input.grievanceId?.trim().toLowerCase();
    const normalizedStudentId = input.studentId?.trim().toLowerCase();
    const normalizedQuery = input.query?.trim().toLowerCase();

    let matches = [...grievances];

    if (normalizedId) {
      matches = matches.filter(
        (item) => item.grievanceId.toLowerCase() === normalizedId,
      );
    }

    if (normalizedStudentId) {
      matches = matches.filter(
        (item) => item.studentId.toLowerCase() === normalizedStudentId,
      );
    }

    if (normalizedQuery) {
      matches = matches.filter((item) =>
        [
          item.grievanceId,
          item.studentId,
          item.studentName,
          item.title,
          item.description,
          item.category,
          item.department,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      );
    }

    if (matches.length === 0) {
      return {
        found: false,
        message:
          "No matching grievance was found in the institutional grievance dataset.",
        searched: {
          grievanceId: input.grievanceId ?? null,
          studentId: input.studentId ?? null,
          query: input.query ?? null,
        },
      };
    }

    return {
      found: true,
      count: matches.length,
      grievances: matches.map((item) => ({
        grievanceId: item.grievanceId,
        studentId: item.studentId,
        studentName: item.studentName,
        category: item.category,
        title: item.title,
        description: item.description,
        status: item.status,
        priority: item.priority,
        department: item.department,
        assignedOfficer: item.assignedOfficer,
        submittedAt: item.submittedAt,
        lastUpdatedAt: item.lastUpdatedAt,
        resolvedAt: item.resolvedAt ?? null,
        affectedStudentCount: item.affectedStudentCount,
        sensitive: item.sensitive,
        slaHours: item.slaHours,
        ageHours: Math.round(calculateAgeHours(item)),
        waitingHours: Math.round(calculateWaitingHours(item)),
        overdue: isOverdue(item),
        history: item.history,
      })),
    };
  },
});
