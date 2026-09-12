export type GrievanceStatus =
  | "New"
  | "Under Review"
  | "Assigned"
  | "Escalated"
  | "Resolved"
  | "Closed";

export type Priority = "Low" | "Medium" | "High" | "Critical";

export type GrievanceCategory =
  | "Academic"
  | "Examination"
  | "Fees/Finance"
  | "Scholarship"
  | "Hostel"
  | "Transport"
  | "IT/Technology"
  | "Harassment/Conduct"
  | "Facilities"
  | "Administrative"
  | "Other";

export type GrievanceHistoryEvent = {
  timestamp: string;
  status: GrievanceStatus;
  note: string;
};

export type Grievance = {
  grievanceId: string;
  studentId: string;
  studentName: string;
  category: GrievanceCategory;
  title: string;
  description: string;
  submittedAt: string;
  lastUpdatedAt: string;
  resolvedAt?: string;
  status: GrievanceStatus;
  priority: Priority;
  department: string;
  assignedOfficer: string;
  affectedStudentCount: number;
  sensitive: boolean;
  slaHours: number;
  history: GrievanceHistoryEvent[];
};

export type Department = {
  department: string;
  head: string;
  normalSlaHours: number;
};

export type Policy = {
  policyId: string;
  title: string;
  category: GrievanceCategory | "General";
  keywords: string[];
  summary: string;
  steps: string[];
  slaHours?: number;
  escalationRule: string;
  source: string;
};

export const departments: Department[] = [
  {
    department: "Financial Aid",
    head: "Dr. Anita Rao",
    normalSlaHours: 72,
  },
  {
    department: "Examinations",
    head: "Prof. Michael Dube",
    normalSlaHours: 120,
  },
  {
    department: "Academic Affairs",
    head: "Prof. Sarah Mensah",
    normalSlaHours: 96,
  },
  {
    department: "Facilities",
    head: "James Okoro",
    normalSlaHours: 96,
  },
  {
    department: "Hostel Services",
    head: "Priya Nair",
    normalSlaHours: 72,
  },
  {
    department: "IT Services",
    head: "Daniel Kim",
    normalSlaHours: 48,
  },
  {
    department: "Student Affairs",
    head: "Grace Williams",
    normalSlaHours: 72,
  },
];

export const grievances: Grievance[] = [
  {
    grievanceId: "GRV-1001",
    studentId: "STU-2047",
    studentName: "Amara Ncube",
    category: "Scholarship",
    title: "Scholarship disbursement delayed",
    description:
      "Scholarship payment has not been released despite the student's award being approved.",
    submittedAt: "2026-08-20T09:10:00Z",
    lastUpdatedAt: "2026-09-08T11:30:00Z",
    status: "Escalated",
    priority: "Critical",
    department: "Financial Aid",
    assignedOfficer: "Linda Moyo",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 72,
    history: [
      {
        timestamp: "2026-08-20T09:10:00Z",
        status: "New",
        note: "Grievance submitted.",
      },
      {
        timestamp: "2026-08-21T10:00:00Z",
        status: "Under Review",
        note: "Award approval verified.",
      },
      {
        timestamp: "2026-08-27T13:30:00Z",
        status: "Assigned",
        note: "Assigned to Financial Aid.",
      },
      {
        timestamp: "2026-09-08T11:30:00Z",
        status: "Escalated",
        note: "SLA breach detected.",
      },
    ],
  },
  {
    grievanceId: "GRV-1002",
    studentId: "STU-2012",
    studentName: "Chipo Banda",
    category: "Examination",
    title: "Final exam result disputed",
    description:
      "Student disputes a final examination result and requests a formal review.",
    submittedAt: "2026-09-04T08:30:00Z",
    lastUpdatedAt: "2026-09-07T14:20:00Z",
    status: "Under Review",
    priority: "High",
    department: "Examinations",
    assignedOfficer: "Peter Maseko",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 120,
    history: [
      {
        timestamp: "2026-09-04T08:30:00Z",
        status: "New",
        note: "Appeal submitted.",
      },
      {
        timestamp: "2026-09-05T12:10:00Z",
        status: "Under Review",
        note: "Exam records requested.",
      },
    ],
  },
  {
    grievanceId: "GRV-1003",
    studentId: "STU-2091",
    studentName: "Daniel Mensah",
    category: "Hostel",
    title: "Repeated hot-water outage",
    description:
      "Student reports repeated hot-water failures affecting an entire residence block.",
    submittedAt: "2026-08-25T07:15:00Z",
    lastUpdatedAt: "2026-09-05T16:10:00Z",
    status: "Assigned",
    priority: "High",
    department: "Hostel Services",
    assignedOfficer: "Ravi Patel",
    affectedStudentCount: 84,
    sensitive: false,
    slaHours: 72,
    history: [
      {
        timestamp: "2026-08-25T07:15:00Z",
        status: "New",
        note: "Facility issue reported.",
      },
      {
        timestamp: "2026-08-26T10:15:00Z",
        status: "Assigned",
        note: "Maintenance team assigned.",
      },
    ],
  },
  {
    grievanceId: "GRV-1004",
    studentId: "STU-2031",
    studentName: "Tariro Moyo",
    category: "IT/Technology",
    title: "Student portal login failure",
    description:
      "Unable to access the student portal after password reset.",
    submittedAt: "2026-09-10T07:10:00Z",
    lastUpdatedAt: "2026-09-10T09:25:00Z",
    status: "Resolved",
    priority: "Medium",
    department: "IT Services",
    assignedOfficer: "Kevin Chen",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 48,
    resolvedAt: "2026-09-10T09:25:00Z",
    history: [
      {
        timestamp: "2026-09-10T07:10:00Z",
        status: "New",
        note: "Login problem reported.",
      },
      {
        timestamp: "2026-09-10T09:25:00Z",
        status: "Resolved",
        note: "Account credentials synchronized.",
      },
    ],
  },
  {
    grievanceId: "GRV-1005",
    studentId: "STU-2052",
    studentName: "Brian Chirwa",
    category: "Fees/Finance",
    title: "Incorrect tuition fee balance",
    description:
      "Student account displays a balance that does not match the payment receipt.",
    submittedAt: "2026-08-29T11:00:00Z",
    lastUpdatedAt: "2026-09-03T12:30:00Z",
    status: "Assigned",
    priority: "High",
    department: "Financial Aid",
    assignedOfficer: "Linda Moyo",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 72,
    history: [
      {
        timestamp: "2026-08-29T11:00:00Z",
        status: "New",
        note: "Payment mismatch reported.",
      },
      {
        timestamp: "2026-09-01T12:00:00Z",
        status: "Assigned",
        note: "Account reconciliation started.",
      },
    ],
  },
  {
    grievanceId: "GRV-1006",
    studentId: "STU-2080",
    studentName: "Rudo Sibanda",
    category: "Transport",
    title: "Campus shuttle cancellations",
    description:
      "Morning shuttle cancellations are causing repeated late arrivals for students.",
    submittedAt: "2026-08-27T06:40:00Z",
    lastUpdatedAt: "2026-09-06T08:20:00Z",
    status: "Under Review",
    priority: "High",
    department: "Student Affairs",
    assignedOfficer: "Grace Williams",
    affectedStudentCount: 47,
    sensitive: false,
    slaHours: 72,
    history: [
      {
        timestamp: "2026-08-27T06:40:00Z",
        status: "New",
        note: "Transport issue reported.",
      },
      {
        timestamp: "2026-08-29T09:00:00Z",
        status: "Under Review",
        note: "Route cancellation pattern confirmed.",
      },
    ],
  },
  {
    grievanceId: "GRV-1007",
    studentId: "STU-2075",
    studentName: "Blessing Phiri",
    category: "Facilities",
    title: "Broken study-room lighting",
    description:
      "Multiple lights in the central study room are not working.",
    submittedAt: "2026-09-01T15:30:00Z",
    lastUpdatedAt: "2026-09-04T08:30:00Z",
    status: "Resolved",
    priority: "Medium",
    department: "Facilities",
    assignedOfficer: "James Okoro",
    affectedStudentCount: 62,
    sensitive: false,
    slaHours: 96,
    resolvedAt: "2026-09-04T08:30:00Z",
    history: [
      {
        timestamp: "2026-09-01T15:30:00Z",
        status: "New",
        note: "Facilities issue submitted.",
      },
      {
        timestamp: "2026-09-04T08:30:00Z",
        status: "Resolved",
        note: "Lighting replaced.",
      },
    ],
  },
  {
    grievanceId: "GRV-1008",
    studentId: "STU-2100",
    studentName: "Musa Kamara",
    category: "Academic",
    title: "Missing academic advisor",
    description:
      "Student has not been assigned an academic advisor for the semester.",
    submittedAt: "2026-09-02T10:30:00Z",
    lastUpdatedAt: "2026-09-05T11:00:00Z",
    status: "Assigned",
    priority: "Medium",
    department: "Academic Affairs",
    assignedOfficer: "Sarah Mensah",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 96,
    history: [
      {
        timestamp: "2026-09-02T10:30:00Z",
        status: "New",
        note: "Advisor assignment requested.",
      },
      {
        timestamp: "2026-09-05T11:00:00Z",
        status: "Assigned",
        note: "Academic Affairs reviewing advisor capacity.",
      },
    ],
  },
  {
    grievanceId: "GRV-1009",
    studentId: "STU-2023",
    studentName: "Nadia Dlamini",
    category: "Scholarship",
    title: "Scholarship renewal not reflected",
    description:
      "Approved scholarship renewal is missing from the student's finance account.",
    submittedAt: "2026-08-22T13:20:00Z",
    lastUpdatedAt: "2026-09-01T16:45:00Z",
    status: "Under Review",
    priority: "High",
    department: "Financial Aid",
    assignedOfficer: "Linda Moyo",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 72,
    history: [
      {
        timestamp: "2026-08-22T13:20:00Z",
        status: "New",
        note: "Renewal issue reported.",
      },
      {
        timestamp: "2026-08-24T09:15:00Z",
        status: "Under Review",
        note: "Renewal approval verified.",
      },
    ],
  },
  {
    grievanceId: "GRV-1010",
    studentId: "STU-2066",
    studentName: "Samuel Zulu",
    category: "Harassment/Conduct",
    title: "Reported inappropriate conduct",
    description:
      "Student submitted a sensitive conduct complaint involving another member of the campus community.",
    submittedAt: "2026-09-07T12:00:00Z",
    lastUpdatedAt: "2026-09-07T15:15:00Z",
    status: "Escalated",
    priority: "Critical",
    department: "Student Affairs",
    assignedOfficer: "Grace Williams",
    affectedStudentCount: 1,
    sensitive: true,
    slaHours: 24,
    history: [
      {
        timestamp: "2026-09-07T12:00:00Z",
        status: "New",
        note: "Sensitive conduct complaint received.",
      },
      {
        timestamp: "2026-09-07T15:15:00Z",
        status: "Escalated",
        note: "Human review required.",
      },
    ],
  },
  {
    grievanceId: "GRV-1011",
    studentId: "STU-2114",
    studentName: "Faith Tembo",
    category: "Examination",
    title: "Delayed exam script release",
    description:
      "Student has been waiting for access to an examination script needed for an appeal.",
    submittedAt: "2026-08-30T09:45:00Z",
    lastUpdatedAt: "2026-09-06T10:00:00Z",
    status: "Under Review",
    priority: "High",
    department: "Examinations",
    assignedOfficer: "Peter Maseko",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 120,
    history: [
      {
        timestamp: "2026-08-30T09:45:00Z",
        status: "New",
        note: "Script access requested.",
      },
      {
        timestamp: "2026-09-02T10:00:00Z",
        status: "Under Review",
        note: "Script location being confirmed.",
      },
    ],
  },
  {
    grievanceId: "GRV-1012",
    studentId: "STU-2120",
    studentName: "David Osei",
    category: "Transport",
    title: "Evening shuttle capacity",
    description:
      "Evening buses are consistently full after late lectures.",
    submittedAt: "2026-08-18T17:00:00Z",
    lastUpdatedAt: "2026-08-30T10:00:00Z",
    status: "Resolved",
    priority: "Medium",
    department: "Student Affairs",
    assignedOfficer: "Grace Williams",
    affectedStudentCount: 91,
    sensitive: false,
    slaHours: 72,
    resolvedAt: "2026-08-30T10:00:00Z",
    history: [
      {
        timestamp: "2026-08-18T17:00:00Z",
        status: "New",
        note: "Transport capacity concern raised.",
      },
      {
        timestamp: "2026-08-30T10:00:00Z",
        status: "Resolved",
        note: "Additional evening vehicle assigned.",
      },
    ],
  },
  {
    grievanceId: "GRV-1013",
    studentId: "STU-2142",
    studentName: "Lydia Banda",
    category: "Facilities",
    title: "Water leakage in residence",
    description:
      "A leaking pipe is damaging the floor in a residence building.",
    submittedAt: "2026-09-03T06:30:00Z",
    lastUpdatedAt: "2026-09-05T09:10:00Z",
    status: "Assigned",
    priority: "High",
    department: "Facilities",
    assignedOfficer: "James Okoro",
    affectedStudentCount: 38,
    sensitive: false,
    slaHours: 96,
    history: [
      {
        timestamp: "2026-09-03T06:30:00Z",
        status: "New",
        note: "Leak reported.",
      },
      {
        timestamp: "2026-09-05T09:10:00Z",
        status: "Assigned",
        note: "Plumbing team dispatched.",
      },
    ],
  },
  {
    grievanceId: "GRV-1014",
    studentId: "STU-2131",
    studentName: "Tawanda Sibanda",
    category: "IT/Technology",
    title: "Learning platform outage",
    description:
      "A course learning platform was unavailable for several students during an assignment deadline.",
    submittedAt: "2026-08-19T10:20:00Z",
    lastUpdatedAt: "2026-08-20T18:10:00Z",
    status: "Resolved",
    priority: "High",
    department: "IT Services",
    assignedOfficer: "Kevin Chen",
    affectedStudentCount: 126,
    sensitive: false,
    slaHours: 48,
    resolvedAt: "2026-08-20T18:10:00Z",
    history: [
      {
        timestamp: "2026-08-19T10:20:00Z",
        status: "New",
        note: "Platform outage reported.",
      },
      {
        timestamp: "2026-08-20T18:10:00Z",
        status: "Resolved",
        note: "Platform restored.",
      },
    ],
  },
  {
    grievanceId: "GRV-1015",
    studentId: "STU-2041",
    studentName: "Eunice Chanda",
    category: "Administrative",
    title: "Transcript request delayed",
    description:
      "Official transcript request has not been completed within the expected processing period.",
    submittedAt: "2026-08-24T09:00:00Z",
    lastUpdatedAt: "2026-09-04T13:00:00Z",
    status: "Escalated",
    priority: "High",
    department: "Student Affairs",
    assignedOfficer: "Grace Williams",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 72,
    history: [
      {
        timestamp: "2026-08-24T09:00:00Z",
        status: "New",
        note: "Transcript requested.",
      },
      {
        timestamp: "2026-09-04T13:00:00Z",
        status: "Escalated",
        note: "Processing deadline exceeded.",
      },
    ],
  },
  {
    grievanceId: "GRV-1016",
    studentId: "STU-2150",
    studentName: "Kelvin Banda",
    category: "Examination",
    title: "Exam timetable conflict",
    description:
      "Two required examinations are scheduled too close together for the student.",
    submittedAt: "2026-09-06T07:00:00Z",
    lastUpdatedAt: "2026-09-07T08:30:00Z",
    status: "Assigned",
    priority: "High",
    department: "Examinations",
    assignedOfficer: "Peter Maseko",
    affectedStudentCount: 23,
    sensitive: false,
    slaHours: 120,
    history: [
      {
        timestamp: "2026-09-06T07:00:00Z",
        status: "New",
        note: "Timetable conflict reported.",
      },
      {
        timestamp: "2026-09-07T08:30:00Z",
        status: "Assigned",
        note: "Examination scheduling team reviewing.",
      },
    ],
  },
  {
    grievanceId: "GRV-1017",
    studentId: "STU-2161",
    studentName: "Mary Wanjiku",
    category: "Hostel",
    title: "Repeated power interruptions",
    description:
      "A residence block is experiencing repeated power interruptions at night.",
    submittedAt: "2026-08-26T19:00:00Z",
    lastUpdatedAt: "2026-09-06T17:00:00Z",
    status: "Under Review",
    priority: "High",
    department: "Hostel Services",
    assignedOfficer: "Ravi Patel",
    affectedStudentCount: 73,
    sensitive: false,
    slaHours: 72,
    history: [
      {
        timestamp: "2026-08-26T19:00:00Z",
        status: "New",
        note: "Power issue reported.",
      },
      {
        timestamp: "2026-08-29T08:00:00Z",
        status: "Under Review",
        note: "Electrical inspection ordered.",
      },
    ],
  },
  {
    grievanceId: "GRV-1018",
    studentId: "STU-2175",
    studentName: "Josephine Adjei",
    category: "Fees/Finance",
    title: "Duplicate fee charge",
    description:
      "Student account shows the same administrative fee twice.",
    submittedAt: "2026-09-03T14:00:00Z",
    lastUpdatedAt: "2026-09-04T12:00:00Z",
    status: "Resolved",
    priority: "Medium",
    department: "Financial Aid",
    assignedOfficer: "Linda Moyo",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 72,
    resolvedAt: "2026-09-04T12:00:00Z",
    history: [
      {
        timestamp: "2026-09-03T14:00:00Z",
        status: "New",
        note: "Duplicate charge reported.",
      },
      {
        timestamp: "2026-09-04T12:00:00Z",
        status: "Resolved",
        note: "Duplicate entry removed.",
      },
    ],
  },
  {
    grievanceId: "GRV-1019",
    studentId: "STU-2182",
    studentName: "Moses Karanja",
    category: "Academic",
    title: "Course registration error",
    description:
      "Required course is missing from the student's current registration.",
    submittedAt: "2026-09-08T08:00:00Z",
    lastUpdatedAt: "2026-09-08T13:00:00Z",
    status: "Under Review",
    priority: "Medium",
    department: "Academic Affairs",
    assignedOfficer: "Sarah Mensah",
    affectedStudentCount: 1,
    sensitive: false,
    slaHours: 96,
    history: [
      {
        timestamp: "2026-09-08T08:00:00Z",
        status: "New",
        note: "Registration issue submitted.",
      },
      {
        timestamp: "2026-09-08T13:00:00Z",
        status: "Under Review",
        note: "Department checking registration records.",
      },
    ],
  },
  {
    grievanceId: "GRV-1020",
    studentId: "STU-2194",
    studentName: "Aisha Yusuf",
    category: "Facilities",
    title: "Library air-conditioning failure",
    description:
      "Air-conditioning is not working in a large library study area.",
    submittedAt: "2026-08-28T09:30:00Z",
    lastUpdatedAt: "2026-09-05T12:15:00Z",
    status: "Assigned",
    priority: "Medium",
    department: "Facilities",
    assignedOfficer: "James Okoro",
    affectedStudentCount: 118,
    sensitive: false,
    slaHours: 96,
    history: [
      {
        timestamp: "2026-08-28T09:30:00Z",
        status: "New",
        note: "Library HVAC problem reported.",
      },
      {
        timestamp: "2026-08-30T10:15:00Z",
        status: "Assigned",
        note: "Maintenance contractor contacted.",
      },
    ],
  },
];

export const policies: Policy[] = [
  {
    policyId: "POL-EXAM-001",
    title: "Academic Examination Appeal Procedure",
    category: "Examination",
    keywords: ["exam", "appeal", "result", "script", "review"],
    summary:
      "Students may request an examination review through the formal appeals process.",
    steps: [
      "Submit an examination appeal through the student portal.",
      "Provide the course code, examination date, and grounds for appeal.",
      "Examinations verifies the submission and retrieves the relevant script.",
      "An authorized academic reviewer evaluates the appeal.",
      "The decision is communicated to the student.",
    ],
    slaHours: 120,
    escalationRule:
      "Escalate when the appeal exceeds five working days without a review decision.",
    source: "Institutional Examination Appeals Policy",
  },
  {
    policyId: "POL-SCH-001",
    title: "Scholarship Disbursement Service Standard",
    category: "Scholarship",
    keywords: ["scholarship", "award", "payment", "disbursement", "financial aid"],
    summary:
      "Approved scholarship awards should be processed within the standard financial aid service window.",
    steps: [
      "Verify the student's scholarship award status.",
      "Confirm financial clearance and banking details.",
      "Process the approved disbursement.",
      "Notify the student when the payment is released.",
    ],
    slaHours: 72,
    escalationRule:
      "Escalate when an approved scholarship remains unpaid after 72 hours or when the student is at immediate financial risk.",
    source: "Student Financial Aid Service Standard",
  },
  {
    policyId: "POL-SLA-001",
    title: "Student Grievance Service-Level Standard",
    category: "General",
    keywords: ["sla", "deadline", "overdue", "response", "service level"],
    summary:
      "Grievances should be acknowledged, assigned, and progressed according to category-specific response targets.",
    steps: [
      "Acknowledge the grievance.",
      "Classify the complaint.",
      "Assign the responsible department.",
      "Monitor elapsed time against the service target.",
      "Escalate overdue or high-risk cases.",
    ],
    escalationRule:
      "Any grievance exceeding its target SLA without resolution should be flagged for escalation review.",
    source: "Student Grievance Management Standard",
  },
  {
    policyId: "POL-CON-001",
    title: "Sensitive Conduct Complaint Handling",
    category: "Harassment/Conduct",
    keywords: ["harassment", "conduct", "bullying", "misconduct", "sensitive"],
    summary:
      "Sensitive conduct complaints require confidential human review and must not be resolved solely by automated judgment.",
    steps: [
      "Protect the confidentiality of the complaint.",
      "Assign the matter to an authorized human reviewer.",
      "Assess immediate safety and support needs.",
      "Follow the institutional investigation process.",
      "Communicate procedural updates without making premature findings.",
    ],
    slaHours: 24,
    escalationRule:
      "Sensitive conduct matters require immediate human review and escalation when safety or procedural risk is present.",
    source: "Student Conduct and Safeguarding Procedure",
  },
  {
    policyId: "POL-FEE-001",
    title: "Student Fees Reconciliation Procedure",
    category: "Fees/Finance",
    keywords: ["fees", "tuition", "balance", "payment", "charge", "finance"],
    summary:
      "Finance disputes require reconciliation of the student ledger against receipts and approved charges.",
    steps: [
      "Verify the student's account ledger.",
      "Compare posted payments against receipts.",
      "Identify duplicate or missing entries.",
      "Correct confirmed discrepancies.",
      "Notify the student of the outcome.",
    ],
    slaHours: 72,
    escalationRule:
      "Escalate when a verified discrepancy remains unresolved beyond the financial service target.",
    source: "Student Finance Reconciliation Procedure",
  },
  {
    policyId: "POL-HOS-001",
    title: "Residence Facilities Response Standard",
    category: "Hostel",
    keywords: ["hostel", "residence", "water", "power", "maintenance"],
    summary:
      "Residence service failures affecting multiple students receive elevated operational priority.",
    steps: [
      "Assess the affected residence area.",
      "Determine whether the failure affects essential services.",
      "Assign facilities or maintenance support.",
      "Provide interim mitigation where possible.",
      "Confirm restoration with residence management.",
    ],
    slaHours: 72,
    escalationRule:
      "Escalate when essential services affect a large student population or remain unresolved beyond the target.",
    source: "Residence Facilities Response Standard",
  },
];

export function getDepartment(name: string) {
  return departments.find(
    (department) =>
      department.department.toLowerCase() === name.toLowerCase(),
  );
}

export function calculateAgeHours(submittedAt: string): number {
  return Math.max(
    0,
    (Date.now() - new Date(submittedAt).getTime()) / (1000 * 60 * 60),
  );
}

export function calculateWaitingHours(grievance: Grievance): number {
  const end = grievance.resolvedAt
    ? new Date(grievance.resolvedAt).getTime()
    : Date.now();

  return Math.max(
    0,
    (end - new Date(grievance.submittedAt).getTime()) /
      (1000 * 60 * 60),
  );
}

export function isOverdue(grievance: Grievance): boolean {
  if (grievance.status === "Resolved" || grievance.status === "Closed") {
    return false;
  }

  return calculateAgeHours(grievance.submittedAt) > grievance.slaHours;
}

export function calculateSeverityScore(grievance: Grievance): number {
  const priorityScore: Record<Priority, number> = {
    Low: 15,
    Medium: 35,
    High: 65,
    Critical: 90,
  };

  const ageHours = calculateAgeHours(grievance.submittedAt);
  const ageScore = Math.min(25, ageHours / 24);

  const impactScore = Math.min(
    20,
    Math.log10(Math.max(1, grievance.affectedStudentCount)) * 12,
  );

  const overdueScore = isOverdue(grievance) ? 15 : 0;
  const sensitiveScore = grievance.sensitive ? 12 : 0;

  return Math.min(
    100,
    Math.round(
      priorityScore[grievance.priority] +
        ageScore +
        impactScore +
        overdueScore +
        sensitiveScore,
    ),
  );
}
