import { defineTool } from "eve/tools";
import z from "zod";
import {
  calculateSeverityScore,
  departments,
} from "../lib/grievance-data.js";

export default defineTool({
  description:
    "Classify and route a newly submitted student complaint. Determine category, responsible department, urgency, priority, likely affected scope, and recommended action.",
  inputSchema: z.object({
    complaint: z.string().min(3),
    studentId: z.string().optional(),
  }),
  async execute(input) {
    const complaint = input.complaint.trim();
    const text = complaint.toLowerCase();

    const rules = [
      {
        category: "Harassment/Conduct",
        department: "Student Affairs",
        keywords: [
          "harassment",
          "bullying",
          "assault",
          "threat",
          "misconduct",
          "discrimination",
          "unsafe",
        ],
      },
      {
        category: "Scholarship",
        department: "Financial Aid",
        keywords: [
          "scholarship",
          "award",
          "bursary",
          "disbursement",
          "financial aid",
        ],
      },
      {
        category: "Fees/Finance",
        department: "Financial Aid",
        keywords: [
          "fee",
          "fees",
          "tuition",
          "balance",
          "payment",
          "charge",
          "finance",
        ],
      },
      {
        category: "Examination",
        department: "Examinations",
        keywords: [
          "exam",
          "examination",
          "result",
          "script",
          "appeal",
          "timetable",
          "grade",
        ],
      },
      {
        category: "Hostel",
        department: "Hostel Services",
        keywords: [
          "hostel",
          "residence",
          "room",
          "water",
          "power",
          "hot water",
        ],
      },
      {
        category: "Transport",
        department: "Student Affairs",
        keywords: [
          "shuttle",
          "bus",
          "transport",
          "route",
        ],
      },
      {
        category: "IT/Technology",
        department: "IT Services",
        keywords: [
          "portal",
          "login",
          "password",
          "website",
          "system",
          "platform",
          "wifi",
          "internet",
        ],
      },
      {
        category: "Facilities",
        department: "Facilities",
        keywords: [
          "library",
          "light",
          "lighting",
          "leak",
          "building",
          "maintenance",
          "air-conditioning",
        ],
      },
      {
        category: "Academic",
        department: "Academic Affairs",
        keywords: [
          "course",
          "advisor",
          "registration",
          "lecturer",
          "academic",
        ],
      },
    ] as const;

    let bestRule =
      rules.find((rule) =>
        rule.keywords.some((keyword) =>
          text.includes(keyword),
        ),
      ) ?? null;

    if (!bestRule) {
      bestRule = {
        category: "Administrative",
        department: "Student Affairs",
        keywords: [],
      } as const;
    }

    const criticalSignals = [
      "harassment",
      "assault",
      "threat",
      "violence",
      "unsafe",
      "discrimination",
    ];

    const highSignals = [
      "scholarship",
      "exam",
      "examination",
      "payment",
      "fees",
      "hostel",
      "water",
      "power",
    ];

    const massSignals = [
      "students",
      "many students",
      "everyone",
      "whole block",
      "entire class",
      "campus",
      "multiple",
    ];

    const sensitive = criticalSignals.some((signal) =>
      text.includes(signal),
    );

    const highRisk = highSignals.some((signal) =>
      text.includes(signal),
    );

    const massImpact = massSignals.some((signal) =>
      text.includes(signal),
    );

    let priority =
      sensitive
        ? "Critical"
        : highRisk && massImpact
          ? "Critical"
          : highRisk
            ? "High"
            : massImpact
              ? "High"
              : "Medium";

    const urgencyScore =
      priority === "Critical"
        ? 95
        : priority === "High"
          ? 78
          : priority === "Medium"
            ? 50
            : 25;

    const department =
      departments.find(
        (item) =>
          item.department === bestRule.department,
      ) ?? departments[6];

    return {
      classified: true,
      category: bestRule.category,
      department: department.department,
      departmentHead: department.head,
      priority,
      urgencyScore,
      affectedScope: massImpact
        ? "Potentially multiple students"
        : "Individual student",
      sensitive,
      recommendedAction: sensitive
        ? "Immediate confidential human review"
        : priority === "Critical"
          ? "Immediate escalation to the responsible department"
          : priority === "High"
            ? "Prioritized department review"
            : "Normal workflow with SLA monitoring",
      reasoning: [
        `Matched category: ${bestRule.category}`,
        `Recommended owner: ${department.department}`,
        sensitive
          ? "Sensitive conduct/safety indicator detected."
          : null,
        massImpact
          ? "Complaint may affect multiple students."
          : null,
        highRisk
          ? "High-risk service category detected."
          : null,
      ].filter(Boolean),
      availableDepartments: departments.map(
        (item) => item.department,
      ),
    };
  },
});
