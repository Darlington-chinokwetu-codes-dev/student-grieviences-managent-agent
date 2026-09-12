"use client";

import type { UserContent } from "ai";
import { useEveAgent } from "eve/react";
import {
  AlertCircleIcon,
  ArrowUpRightIcon,
  BrainIcon,
  CheckCircle2Icon,
  ClipboardListIcon,
  Clock3Icon,
  FileTextIcon,
  FlagIcon,
  LayoutDashboardIcon,
  MessageSquareTextIcon,
  PlusIcon,
  SearchIcon,
  ShieldAlertIcon,
  SparklesIcon,
  SquareIcon,
  UsersIcon,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
  ConversationTopFade,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  usePromptInputAttachments,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import {
  calculateWaitingHours,
  grievances,
  isOverdue,
} from "../../agent/lib/grievance-data";
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";

const AGENT_NAME = "Resolvia AI";

type ViewMode =
  | "overview"
  | "assistant"
  | "grievances"
  | "students"
  | "escalations"
  | "analytics";

const navigation = [
  {
    id: "overview" as ViewMode,
    label: "Overview",
    icon: LayoutDashboardIcon,
  },
  {
    id: "assistant" as ViewMode,
    label: "AI Assistant",
    icon: MessageSquareTextIcon,
  },
];

const attentionItems = [
  {
    id: "GRV-1001",
    title: "Scholarship disbursement delayed",
    meta: "Financial Aid",
    priority: "Critical",
    sla: "Overdue",
  },
  {
    id: "GRV-1003",
    title: "Repeated hot-water outage",
    meta: "Hostel Services",
    priority: "High",
    sla: "SLA risk",
  },
  {
    id: "GRV-1010",
    title: "Reported inappropriate conduct",
    meta: "Student Affairs",
    priority: "Critical",
    sla: "Human review",
  },
];

export function AgentChat({
  sessionId,
  sessionless = false,
}: {
  readonly sessionId?: string;
  readonly sessionless?: boolean;
}) {
  const [cancellationError, setCancellationError] = useState<string>();
  const [hasInputText, setHasInputText] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("assistant");

  const agent = useEveAgent({
    initialSession:
      sessionId === undefined
        ? undefined
        : {
            sessionId,
            streamIndex: 0,
          },
    resume: sessionId !== undefined,
    onSessionChange(session) {
      if (sessionId === undefined && session !== undefined) {
        History.prototype.replaceState.call(
          window.history,
          window.history.state,
          "",
          `/s/${encodeURIComponent(session.sessionId)}`,
        );
      }
    },
  });

  const isBusy =
    agent.status === "submitted" || agent.status === "streaming";

  const isResuming = agent.status === "resuming";
  const isEmpty = agent.data.messages.length === 0;
  const lastMessage = agent.data.messages.at(-1);

  const isPendingAssistantShell =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.every((part) => part.type === "step-start");

  const showPendingThinking =
    isBusy &&
    (agent.status === "submitted" ||
      lastMessage?.role !== "assistant" ||
      isPendingAssistantShell);

  const turnFailure =
    isBusy || isResuming
      ? undefined
      : getLatestTurnFailure(agent.events);

  const errorMessage =
    cancellationError ?? agent.error?.message ?? turnFailure;

  const hasConversationContent =
    sessionless || !isEmpty || errorMessage !== undefined;

  const showConversationLayout =
    isResuming || hasConversationContent;

  const activeSessionId =
    sessionId ?? agent.session?.sessionId;

  const students = useMemo(() => {
    return Array.from(
      new Map(
        grievances.map((item) => [
          item.studentId,
          {
            studentId: item.studentId,
            studentName: item.studentName,
            grievances: 0,
            open: 0,
          },
        ]),
      ).values(),
    ).map((student) => {
      const studentCases = grievances.filter(
        (item) => item.studentId === student.studentId,
      );

      return {
        ...student,
        grievances: studentCases.length,
        open: studentCases.filter(
          (item) =>
            item.status !== "Resolved" &&
            item.status !== "Closed",
        ).length,
      };
    });
  }, []);

  const overdueCases = useMemo(
    () => grievances.filter(isOverdue),
    [],
  );

  const escalations = useMemo(
    () =>
      grievances.filter(
        (item) =>
          item.priority === "Critical" ||
          item.sensitive ||
          isOverdue(item),
      ),
    [],
  );

  const analytics = useMemo(() => {
    const openCases = grievances.filter(
      (item) =>
        item.status !== "Resolved" &&
        item.status !== "Closed",
    );

    const resolvedCases = grievances.filter(
      (item) =>
        item.status === "Resolved" ||
        item.status === "Closed",
    );

    const departmentMap = new Map<
      string,
      {
        department: string;
        complaints: number;
        open: number;
        resolved: number;
      }
    >();

    for (const item of grievances) {
      const existing = departmentMap.get(item.department) ?? {
        department: item.department,
        complaints: 0,
        open: 0,
        resolved: 0,
      };

      existing.complaints += 1;

      if (
        item.status === "Resolved" ||
        item.status === "Closed"
      ) {
        existing.resolved += 1;
      } else {
        existing.open += 1;
      }

      departmentMap.set(item.department, existing);
    }

    const departments = Array.from(
      departmentMap.values(),
    ).sort((a, b) => b.complaints - a.complaints);

    const averageResolutionHours =
      resolvedCases.length === 0
        ? 0
        : Math.round(
            resolvedCases.reduce(
              (sum, item) =>
                sum + calculateWaitingHours(item),
              0,
            ) / resolvedCases.length,
          );

    return {
      total: grievances.length,
      open: openCases.length,
      resolved: resolvedCases.length,
      overdue: overdueCases.length,
      escalations: escalations.length,
      averageResolutionHours,
      departments,
    };
  }, [escalations.length, overdueCases.length]);

  const requestCancellation = () => {
    setCancellationError(undefined);

    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const handleSubmit = async (
    message: PromptInputMessage,
  ) => {
    const text = message.text.trim();

    if (
      (text.length === 0 &&
        message.files.length === 0) ||
      isResuming
    ) {
      return;
    }

    setHasInputText(false);
    setCancellationError(undefined);
    setViewMode("assistant");

    const options = isBusy
      ? { turnPolicy: "steer" as const }
      : undefined;

    if (message.files.length === 0) {
      await agent.send(text, options);
      return;
    }

    const parts: UserContent = [];

    if (text.length > 0) {
      parts.push({
        text,
        type: "text",
      });
    }

    for (const file of message.files) {
      parts.push({
        data: file.url,
        filename: file.filename,
        mediaType: file.mediaType,
        type: "file",
      });
    }

    await agent.send(parts, options);
  };

  const sendSuggestedPrompt = async (prompt: string) => {
    if (isResuming) return;

    setViewMode("assistant");
    setCancellationError(undefined);

    const options = isBusy
      ? { turnPolicy: "steer" as const }
      : undefined;

    await agent.send(prompt, options);
  };

  const openGrievance = async (grievanceId: string) => {
    setViewMode("assistant");
    setCancellationError(undefined);

    const prompt = `Investigate grievance ${grievanceId}. Give me its current status, priority, department, SLA status, waiting time, relevant history, and recommended next step.`;

    const options = isBusy
      ? { turnPolicy: "steer" as const }
      : undefined;

    await agent.send(prompt, options);
  };

  const composer = (
    <div className="rounded-[22px] border border-[#ddd7ce] bg-white p-2 shadow-[0_12px_36px_rgba(34,29,40,0.09)]">
      <PromptInput onSubmit={handleSubmit}>
        <PromptInputTextarea
          disabled={isResuming}
          onChange={(event) =>
            setHasInputText(
              event.currentTarget.value.trim().length > 0,
            )
          }
          placeholder="Ask Resolvia to investigate a grievance, check an SLA, find the right department..."
          className="min-h-[70px] resize-none border-0 bg-transparent px-4 pt-3 text-[15px] shadow-none focus-visible:ring-0"
        />

        <div className="flex items-center justify-between gap-3 px-2 pb-1">
          <div className="hidden items-center gap-2 text-xs text-[#8b8492] sm:flex">
            <div className="flex items-center gap-1.5">
              <span className="size-1.5 rounded-full bg-[#1fa774]" />
              AI decision engine ready
            </div>

            <span className="text-[#d7d0c7]">•</span>

            <span>Evidence-based analysis</span>
          </div>

          <ComposerAction
            hasInputText={hasInputText}
            isBusy={isBusy}
            isResuming={isResuming}
            onCancel={requestCancellation}
          />
        </div>
      </PromptInput>
    </div>
  );

  return (
    <main className="flex h-dvh overflow-hidden bg-[#f7f5f0] text-[#201d26]">
      <Sidebar
        activeView={viewMode}
        mobileOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        onViewChange={(view) => {
          setViewMode(view);
          setMobileNavOpen(false);
        }}
      />

      <section className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        <TopBar
          activeView={viewMode}
          canStartNewChat={activeSessionId !== undefined}
          onOpenNav={() => setMobileNavOpen(true)}
          onViewChange={setViewMode}
        />

        {viewMode === "overview" ? (
          <Overview
            analytics={analytics}
            onOpenAssistant={() => setViewMode("assistant")}
            onOpenGrievances={() => setViewMode("grievances")}
            onOpenEscalations={() =>
              setViewMode("escalations")
            }
            onSendPrompt={sendSuggestedPrompt}
          />
        ) : null}

        {viewMode === "assistant" ? (
          <AssistantWorkspace
            composer={composer}
            isEmpty={isEmpty}
            isPendingAssistantShell={
              isPendingAssistantShell
            }
            showConversationLayout={
              showConversationLayout
            }
            showPendingThinking={
              showPendingThinking
            }
            errorMessage={errorMessage}
            agent={agent}
            sessionId={sessionId}
            activeSessionId={activeSessionId}
            isBusy={isBusy}
            isResuming={isResuming}
            onCancellationReset={() =>
              setCancellationError(undefined)
            }
            onSendPrompt={sendSuggestedPrompt}
          />
        ) : null}

        {viewMode === "grievances" ? (
          <GrievancesView
            onOpenAssistant={() =>
              setViewMode("assistant")
            }
            onOpenGrievance={openGrievance}
          />
        ) : null}

        {viewMode === "students" ? (
          <StudentsView
            students={students}
            onOpenGrievance={openGrievance}
          />
        ) : null}

        {viewMode === "escalations" ? (
          <EscalationsView
            cases={escalations}
            onOpenGrievance={openGrievance}
          />
        ) : null}

        {viewMode === "analytics" ? (
          <AnalyticsView analytics={analytics} />
        ) : null}
      </section>
    </main>
  );
}

function Sidebar({
  activeView,
  mobileOpen,
  onClose,
  onViewChange,
}: {
  readonly activeView: ViewMode;
  readonly mobileOpen: boolean;
  readonly onClose: () => void;
  readonly onViewChange: (view: ViewMode) => void;
}) {
  return (
    <>
      {mobileOpen ? (
        <button
          aria-label="Close navigation"
          className="fixed inset-0 z-30 bg-[#201d26]/20 backdrop-blur-[2px] lg:hidden"
          onClick={onClose}
          type="button"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-[272px] shrink-0 flex-col border-r border-[#e5e0d8] bg-[#fcfbf8] transition-transform duration-200 lg:relative lg:translate-x-0",
          mobileOpen
            ? "translate-x-0"
            : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col px-4 py-5">
          <button
            className="mb-7 flex items-center gap-3 px-2 text-left"
            onClick={() => onViewChange("overview")}
            type="button"
          >
            <div className="relative flex size-10 items-center justify-center rounded-[13px] bg-[#5146e5] text-white shadow-[0_7px_16px_rgba(81,70,229,0.24)]">
              <span className="text-sm font-bold">
                R
              </span>
              <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#fcfbf8] bg-[#f97362]" />
            </div>

            <div>
              <div className="text-[16px] font-semibold">
                Resolvia
              </div>
              <div className="text-[11px] uppercase tracking-[0.15em] text-[#938d99]">
                Student Affairs AI
              </div>
            </div>
          </button>

          <div className="mb-5 rounded-[16px] border border-[#e6e1da] bg-white p-3">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-[10px] bg-[#eeecff] text-[#5146e5]">
                <ShieldAlertIcon className="size-4" />
              </div>

              <div className="min-w-0">
                <div className="text-xs font-semibold">
                  Demo institution
                </div>
                <div className="truncate text-[11px] text-[#958e9b]">
                  Autonomous resolution workspace
                </div>
              </div>
            </div>
          </div>

          <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a099a4]">
            Workspace
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = activeView === item.id;

              return (
                <button
                  key={item.id}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition",
                    active
                      ? "bg-[#eeecff] font-semibold text-[#5146e5]"
                      : "text-[#67616e] hover:bg-[#f2efe9]",
                  )}
                  onClick={() =>
                    onViewChange(item.id)
                  }
                  type="button"
                >
                  <Icon className="size-[17px]" />
                  <span>{item.label}</span>

                  {item.id === "assistant" ? (
                    <span className="ml-auto size-1.5 rounded-full bg-[#1fa774]" />
                  ) : null}
                </button>
              );
            })}
          </nav>

          <div className="mb-2 mt-7 px-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a099a4]">
            Operations
          </div>

          <nav className="space-y-1">
            <SidebarOperation
              icon={ClipboardListIcon}
              label="Grievances"
              count={grievances.length}
              active={activeView === "grievances"}
              onClick={() => onViewChange("grievances")}
            />

            <SidebarOperation
              icon={UsersIcon}
              label="Students"
              count={
                new Set(
                  grievances.map(
                    (item) => item.studentId,
                  ),
                ).size
              }
              active={activeView === "students"}
              onClick={() => onViewChange("students")}
            />

            <SidebarOperation
              icon={ShieldAlertIcon}
              label="Escalations"
              count={escalationsCount()}
              alert
              active={activeView === "escalations"}
              onClick={() =>
                onViewChange("escalations")
              }
            />

            <SidebarOperation
              icon={SearchIcon}
              label="Analytics"
              active={activeView === "analytics"}
              onClick={() =>
                onViewChange("analytics")
              }
            />
          </nav>

          <div className="mt-auto">
            <div className="mb-3 rounded-[16px] border border-[#e7e1d8] bg-[#f3f0e8] p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#766f7b]">
                  System health
                </div>

                <span className="flex items-center gap-1.5 text-[11px] font-medium text-[#27825f]">
                  <span className="size-1.5 rounded-full bg-[#1fa774]" />
                  Operational
                </span>
              </div>

              <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-[#ddd8cf]">
                <div className="h-full w-[92%] rounded-full bg-[#5146e5]" />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#918a95]">
                <span>Resolution engine</span>
                <span>92%</span>
              </div>
            </div>

            <div className="flex items-center gap-3 border-t border-[#e9e4dc] px-2 pt-4">
              <div className="flex size-8 items-center justify-center rounded-full bg-[#201d26] text-[11px] font-semibold text-white">
                SA
              </div>

              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">
                  Student Affairs
                </div>
                <div className="text-[10px] text-[#938d98]">
                  Administrator workspace
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

function SidebarOperation({
  icon: Icon,
  label,
  count,
  alert = false,
  active,
  onClick,
}: {
  readonly icon: typeof ClipboardListIcon;
  readonly label: string;
  readonly count?: number;
  readonly alert?: boolean;
  readonly active: boolean;
  readonly onClick: () => void;
}) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm transition",
        active
          ? "bg-[#eeecff] font-semibold text-[#5146e5]"
          : "text-[#67616e] hover:bg-[#f2efe9]",
      )}
      onClick={onClick}
      type="button"
    >
      <Icon className="size-[17px]" />
      <span>{label}</span>

      {count !== undefined ? (
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
            alert
              ? "bg-[#fff0ec] text-[#d85d4f]"
              : "bg-[#f0ede8] text-[#827b88]",
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  );
}

function TopBar({
  activeView,
  canStartNewChat,
  onOpenNav,
  onViewChange,
}: {
  readonly activeView: ViewMode;
  readonly canStartNewChat: boolean;
  readonly onOpenNav: () => void;
  readonly onViewChange: (view: ViewMode) => void;
}) {
  const titles: Record<ViewMode, string> = {
    overview: "Institution overview",
    assistant: "Resolution command center",
    grievances: "Grievance management",
    students: "Student directory",
    escalations: "Escalation queue",
    analytics: "Grievance analytics",
  };

  return (
    <header className="relative z-20 flex h-[74px] shrink-0 items-center border-b border-[#e7e2da] bg-[#f7f5f0]/95 px-4 backdrop-blur sm:px-6">
      <button
        aria-label="Open navigation"
        className="mr-3 rounded-lg p-2 text-[#67616e] hover:bg-[#eeebe5] lg:hidden"
        onClick={onOpenNav}
        type="button"
      >
        <span className="block space-y-1">
          <span className="block h-[2px] w-4 bg-current" />
          <span className="block h-[2px] w-4 bg-current" />
          <span className="block h-[2px] w-4 bg-current" />
        </span>
      </button>

      <div className="min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a099a4]">
          Student Affairs / AI Operations
        </div>

        <div className="truncate text-[17px] font-semibold tracking-[-0.025em]">
          {titles[activeView]}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-[#dfdad2] bg-white px-3 py-1.5 text-[11px] font-medium text-[#6f6875] sm:flex">
          <span className="size-1.5 rounded-full bg-[#1fa774]" />
          Live demo environment
        </div>

        {activeView !== "assistant" ? (
          <Button
            className="hidden rounded-full border-[#ddd7cf] bg-white text-[#58515f] shadow-none hover:bg-[#f3f0ea] sm:inline-flex"
            onClick={() =>
              onViewChange("assistant")
            }
            size="sm"
            type="button"
            variant="outline"
          >
            Open AI Assistant
            <ArrowUpRightIcon className="ml-1.5 size-3.5" />
          </Button>
        ) : null}

        {canStartNewChat ? (
          <Button
            aria-label="Start a new chat"
            className="rounded-full bg-[#5146e5] px-3.5 text-white shadow-[0_6px_16px_rgba(81,70,229,0.18)] hover:bg-[#463bd0]"
            onClick={() =>
              window.location.assign("/s")
            }
            size="sm"
            type="button"
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">
              New investigation
            </span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function Overview({
  analytics,
  onOpenAssistant,
  onOpenGrievances,
  onOpenEscalations,
  onSendPrompt,
}: {
  readonly analytics: ReturnType<
    typeof createAnalytics
  >;
  readonly onOpenAssistant: () => void;
  readonly onOpenGrievances: () => void;
  readonly onOpenEscalations: () => void;
  readonly onSendPrompt: (
    prompt: string,
  ) => Promise<void>;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_380px]">
          <section className="relative overflow-hidden rounded-[24px] border border-[#ddd7cf] bg-white p-6 shadow-[0_10px_36px_rgba(42,35,51,0.05)] sm:p-8">
            <div className="absolute -right-20 -top-24 size-64 rounded-full bg-[#eeecff] blur-3xl" />

            <div className="relative max-w-2xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ddd8ff] bg-[#f5f3ff] px-3 py-1.5 text-[11px] font-semibold text-[#5146e5]">
                <SparklesIcon className="size-3.5" />
                Autonomous grievance intelligence
              </div>

              <h1 className="max-w-xl text-3xl font-semibold tracking-[-0.045em] text-[#211d26] sm:text-[42px] sm:leading-[1.04]">
                Resolve student issues before they become institutional problems.
              </h1>

              <p className="mt-4 max-w-xl text-sm leading-6 text-[#756e7a] sm:text-[15px]">
                Investigate cases, identify risk, understand
                policy, route complaints, and surface
                institutional patterns.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Button
                  className="rounded-full bg-[#5146e5] px-5 text-white shadow-[0_8px_20px_rgba(81,70,229,0.2)] hover:bg-[#463bd0]"
                  onClick={onOpenAssistant}
                  type="button"
                >
                  Investigate a grievance
                  <ArrowUpRightIcon className="ml-1.5 size-4" />
                </Button>

                <Button
                  className="rounded-full border-[#ddd7cf] bg-white px-5 text-[#5f5866] shadow-none hover:bg-[#f4f1eb]"
                  onClick={onOpenGrievances}
                  type="button"
                  variant="outline"
                >
                  View grievance queue
                </Button>
              </div>

              <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat
                  label="Open"
                  value={analytics.open}
                />
                <MiniStat
                  label="Overdue"
                  value={analytics.overdue}
                />
                <MiniStat
                  label="Escalations"
                  value={analytics.escalations}
                />
                <MiniStat
                  label="Resolved"
                  value={analytics.resolved}
                />
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#ddd7cf] bg-[#201d26] p-6 text-white shadow-[0_12px_34px_rgba(32,29,38,0.15)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/45">
                  Attention required
                </div>

                <div className="mt-1 text-lg font-semibold">
                  Current risk queue
                </div>
              </div>

              <div className="flex size-9 items-center justify-center rounded-full bg-white/8">
                <FlagIcon className="size-4 text-[#f7a090]" />
              </div>
            </div>

            <div className="mt-5 space-y-2.5">
              {attentionItems.map((item) => (
                <button
                  className="w-full rounded-[13px] border border-white/8 bg-white/[0.06] p-3.5 text-left transition hover:bg-white/[0.09]"
                  key={item.id}
                  onClick={() =>
                    onSendPrompt(
                      `Investigate ${item.id} and explain its current risk, SLA status, and recommended action.`,
                    )
                  }
                  type="button"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-mono text-[10px] text-white/45">
                      {item.id}
                    </span>

                    <span className="rounded-full bg-[#f97362]/15 px-2 py-0.5 text-[9px] font-semibold text-[#ffad9f]">
                      {item.priority}
                    </span>
                  </div>

                  <div className="mt-1.5 text-xs font-semibold">
                    {item.title}
                  </div>

                  <div className="mt-1 text-[10px] text-white/45">
                    {item.meta} · {item.sla}
                  </div>
                </button>
              ))}
            </div>

            <button
              className="mt-4 text-[11px] font-semibold text-[#b9b4ff] hover:text-white"
              onClick={onOpenEscalations}
              type="button"
            >
              Open complete escalation queue →
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  readonly label: string;
  readonly value: number;
}) {
  return (
    <div className="rounded-[13px] border border-[#ece7e0] bg-[#faf9f6] p-3">
      <div className="text-[10px] uppercase tracking-[0.12em] text-[#9b949f]">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold">
        {value}
      </div>
    </div>
  );
}

function GrievancesView({
  onOpenAssistant,
  onOpenGrievance,
}: {
  readonly onOpenAssistant: () => void;
  readonly onOpenGrievance: (
    grievanceId: string,
  ) => Promise<void>;
}) {
  return (
    <DataPage
      eyebrow="Operations"
      title="Grievance queue"
      description="Every grievance in the demonstration institution, with status, priority, ownership, impact, and SLA state."
    >
      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          className="rounded-full bg-[#5146e5] text-white hover:bg-[#463bd0]"
          onClick={onOpenAssistant}
          size="sm"
          type="button"
        >
          <SparklesIcon className="mr-1.5 size-3.5" />
          Ask Resolvia
        </Button>

        <span className="rounded-full border border-[#e1dcd4] bg-white px-3 py-1.5 text-[11px] text-[#77707c]">
          {grievances.length} total cases
        </span>
      </div>

      <div className="overflow-hidden rounded-[20px] border border-[#dfdad2] bg-white">
        <div className="grid grid-cols-[1fr_auto] border-b border-[#eee9e2] px-5 py-3 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#a099a4] sm:grid-cols-[105px_1.5fr_130px_100px_100px_80px]">
          <span>Case</span>
          <span className="hidden sm:block">Complaint</span>
          <span className="hidden sm:block">Department</span>
          <span className="hidden sm:block">Status</span>
          <span className="hidden sm:block">Priority</span>
          <span className="text-right">View</span>
        </div>

        <div className="divide-y divide-[#eee9e2]">
          {grievances.map((item) => (
            <button
              key={item.grievanceId}
              className="grid w-full grid-cols-[1fr_auto] items-center gap-4 px-5 py-4 text-left transition hover:bg-[#faf9f6] sm:grid-cols-[105px_1.5fr_130px_100px_100px_80px]"
              onClick={() =>
                onOpenGrievance(item.grievanceId)
              }
              type="button"
            >
              <div>
                <div className="font-mono text-[10px] font-semibold text-[#716a76]">
                  {item.grievanceId}
                </div>

                <div className="mt-1 text-[10px] text-[#a098a4] sm:hidden">
                  {item.department}
                </div>
              </div>

              <div className="hidden min-w-0 sm:block">
                <div className="truncate text-xs font-semibold">
                  {item.title}
                </div>
                <div className="mt-1 truncate text-[10px] text-[#958e9a]">
                  {item.category}
                </div>
              </div>

              <div className="hidden text-[11px] text-[#706977] sm:block">
                {item.department}
              </div>

              <div className="hidden sm:block">
                <StatusBadge status={item.status} />
              </div>

              <div className="hidden sm:block">
                <PriorityBadge
                  priority={item.priority}
                />
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#5146e5]">
                  Open
                  <ArrowUpRightIcon className="size-3" />
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>
    </DataPage>
  );
}

function StudentsView({
  students,
  onOpenGrievance,
}: {
  readonly students: {
    studentId: string;
    studentName: string;
    grievances: number;
    open: number;
  }[];
  readonly onOpenGrievance: (
    grievanceId: string,
  ) => Promise<void>;
}) {
  return (
    <DataPage
      eyebrow="People"
      title="Student directory"
      description="Students represented in the grievance environment and their current case activity."
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {students.map((student) => {
          const latest = grievances
            .filter(
              (item) =>
                item.studentId === student.studentId,
            )
            .sort(
              (a, b) =>
                new Date(b.submittedAt).getTime() -
                new Date(a.submittedAt).getTime(),
            )[0];

          return (
            <button
              key={student.studentId}
              className="rounded-[18px] border border-[#e2ddd5] bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-[#cec8ff] hover:shadow-[0_9px_24px_rgba(81,70,229,0.07)]"
              onClick={() =>
                latest &&
                onOpenGrievance(latest.grievanceId)
              }
              type="button"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-[#201d26] text-[11px] font-semibold text-white">
                  {initials(student.studentName)}
                </div>

                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">
                    {student.studentName}
                  </div>
                  <div className="font-mono text-[10px] text-[#958e9a]">
                    {student.studentId}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <MiniStat
                  label="Cases"
                  value={student.grievances}
                />
                <MiniStat
                  label="Open"
                  value={student.open}
                />
              </div>
            </button>
          );
        })}
      </div>
    </DataPage>
  );
}

function EscalationsView({
  cases,
  onOpenGrievance,
}: {
  readonly cases: typeof grievances;
  readonly onOpenGrievance: (
    grievanceId: string,
  ) => Promise<void>;
}) {
  return (
    <DataPage
      eyebrow="Risk"
      title="Escalation queue"
      description="Cases requiring immediate attention because of severity, SLA breach, sensitive handling, or broad student impact."
    >
      <div className="mb-5 rounded-[16px] border border-[#f0d0ca] bg-[#fff7f4] p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#7f3931]">
          <ShieldAlertIcon className="size-4" />
          Escalation criteria detected
        </div>

        <p className="mt-1.5 text-[11px] leading-5 text-[#966c66]">
          Resolvia surfaces cases for human review using
          severity, SLA, sensitivity, and impact signals.
        </p>
      </div>

      <div className="space-y-3">
        {cases.map((item) => (
          <button
            key={item.grievanceId}
            className="w-full rounded-[18px] border border-[#e1dbd3] bg-white p-4 text-left transition hover:border-[#cec8ff] hover:shadow-[0_9px_24px_rgba(81,70,229,0.07)]"
            onClick={() =>
              onOpenGrievance(item.grievanceId)
            }
            type="button"
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] font-semibold text-[#827b88]">
                {item.grievanceId}
              </span>

              <PriorityBadge
                priority={item.priority}
              />

              {isOverdue(item) ? (
                <span className="rounded-full bg-[#fff0ec] px-2 py-0.5 text-[9px] font-semibold text-[#d85d4f]">
                  OVERDUE
                </span>
              ) : null}

              {item.sensitive ? (
                <span className="rounded-full bg-[#f0efff] px-2 py-0.5 text-[9px] font-semibold text-[#5146e5]">
                  HUMAN REVIEW
                </span>
              ) : null}
            </div>

            <div className="mt-2 text-sm font-semibold">
              {item.title}
            </div>

            <div className="mt-1 text-[11px] text-[#958e9a]">
              {item.department} · affects{" "}
              {item.affectedStudentCount} student
              {item.affectedStudentCount === 1
                ? ""
                : "s"}
            </div>
          </button>
        ))}
      </div>
    </DataPage>
  );
}

function AnalyticsView({
  analytics,
}: {
  readonly analytics: ReturnType<
    typeof createAnalytics
  >;
}) {
  return (
    <DataPage
      eyebrow="Intelligence"
      title="Grievance analytics"
      description="Institution-wide signals derived from the same grievance dataset used by Resolvia's decision tools."
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <BigMetric
          label="Total grievances"
          value={analytics.total}
        />
        <BigMetric
          label="Open"
          value={analytics.open}
        />
        <BigMetric
          label="Overdue"
          value={analytics.overdue}
          danger
        />
        <BigMetric
          label="Resolved"
          value={analytics.resolved}
        />
      </div>

      <section className="mt-5 overflow-hidden rounded-[20px] border border-[#dfdad2] bg-white">
        <div className="border-b border-[#eee9e2] px-5 py-4">
          <div className="text-sm font-semibold">
            Department workload
          </div>
          <div className="mt-1 text-[11px] text-[#958e9a]">
            Complaint volume and current open workload.
          </div>
        </div>

        <div className="divide-y divide-[#eee9e2]">
          {analytics.departments.map(
            (department) => (
              <div
                className="grid grid-cols-[1fr_auto_auto] items-center gap-4 px-5 py-4 sm:grid-cols-[1fr_100px_100px]"
                key={department.department}
              >
                <div>
                  <div className="text-xs font-semibold">
                    {department.department}
                  </div>

                  <div className="mt-1 h-1.5 w-full max-w-[320px] overflow-hidden rounded-full bg-[#eeebe5]">
                    <div
                      className="h-full rounded-full bg-[#5146e5]"
                      style={{
                        width: `${Math.max(
                          8,
                          Math.round(
                            (department.complaints /
                              Math.max(
                                1,
                                analytics.departments[0]
                                  ?.complaints ?? 1,
                              )) *
                              100,
                          ),
                        )}%`,
                      }}
                    />
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {department.complaints}
                  </div>
                  <div className="text-[10px] text-[#a099a4]">
                    complaints
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-semibold text-[#5146e5]">
                    {department.open}
                  </div>
                  <div className="text-[10px] text-[#a099a4]">
                    open
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </section>
    </DataPage>
  );
}

function DataPage({
  eyebrow,
  title,
  description,
  children,
}: {
  readonly eyebrow: string;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9d96a2]">
            {eyebrow}
          </div>

          <h1 className="mt-1 text-2xl font-semibold tracking-[-0.035em]">
            {title}
          </h1>

          <p className="mt-2 max-w-2xl text-sm leading-6 text-[#77707c]">
            {description}
          </p>
        </div>

        {children}
      </div>
    </div>
  );
}

function BigMetric({
  label,
  value,
  danger = false,
}: {
  readonly label: string;
  readonly value: number;
  readonly danger?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-[18px] border p-5",
        danger
          ? "border-[#f0d0ca] bg-[#fff7f4]"
          : "border-[#e2ddd5] bg-white",
      )}
    >
      <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9d96a2]">
        {label}
      </div>
      <div
        className={cn(
          "mt-2 text-3xl font-semibold tracking-[-0.05em]",
          danger ? "text-[#d85d4f]" : "",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function AssistantWorkspace({
  composer,
  isEmpty,
  isPendingAssistantShell,
  showConversationLayout,
  showPendingThinking,
  errorMessage,
  agent,
  sessionId,
  activeSessionId,
  isBusy,
  isResuming,
  onCancellationReset,
  onSendPrompt,
}: {
  readonly composer: ReactNode;
  readonly isEmpty: boolean;
  readonly isPendingAssistantShell: boolean;
  readonly showConversationLayout: boolean;
  readonly showPendingThinking: boolean;
  readonly errorMessage?: string;
  readonly agent: ReturnType<typeof useEveAgent>;
  readonly sessionId?: string;
  readonly activeSessionId?: string;
  readonly isBusy: boolean;
  readonly isResuming: boolean;
  readonly onCancellationReset: () => void;
  readonly onSendPrompt: (
    prompt: string,
  ) => Promise<void>;
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(81,70,229,0.06),transparent_30%)]" />

      <div className="relative flex h-full min-h-0">
        <section className="flex min-w-0 flex-1 flex-col">
          {!showConversationLayout ? (
            <AssistantEmptyState
              onSendPrompt={onSendPrompt}
            />
          ) : (
            <Conversation
              className="min-h-0 flex-1"
              initial={
                sessionId === undefined
                  ? undefined
                  : false
              }
              resize={
                activeSessionId === undefined
                  ? "smooth"
                  : "instant"
              }
              scrollRestorationKey={
                isEmpty ||
                activeSessionId === undefined
                  ? undefined
                  : `eve:web-chat-scroll:${activeSessionId}`
              }
            >
              <ConversationTopFade className="top-0" />

              <ConversationContent className="mx-auto w-full max-w-4xl gap-5 px-4 pb-40 pt-7 sm:px-6 lg:px-10">
                {agent.data.messages.map(
                  (message, index) =>
                    showPendingThinking &&
                    isPendingAssistantShell &&
                    message.id ===
                      agent.data.messages.at(
                        -1,
                      )?.id ? null : (
                      <AgentMessage
                        canRespond={
                          !isBusy &&
                          !isResuming
                        }
                        isStreaming={
                          agent.status ===
                            "streaming" &&
                          index ===
                            agent.data.messages
                              .length -
                              1
                        }
                        key={message.id}
                        message={message}
                        onInputResponses={(
                          inputResponses,
                        ) => {
                          onCancellationReset();

                          return agent.respond(
                            inputResponses,
                          );
                        }}
                      />
                    ),
                )}

                {showPendingThinking ? (
                  <PendingThinking />
                ) : null}

                {errorMessage ? (
                  <ErrorMessage
                    message={errorMessage}
                  />
                ) : null}
              </ConversationContent>

              <ConversationScrollButton />
            </Conversation>
          )}

          <div
            className={cn(
              "relative z-10 mx-auto w-full max-w-4xl px-4 sm:px-6 lg:px-10",
              showConversationLayout
                ? "pb-5 pt-3"
                : "pb-8",
            )}
          >
            {showConversationLayout ? (
              <div className="mb-2 text-center text-[10px] text-[#a29aa6]">
                Resolvia reasons over grievance context,
                policy, priority and routing evidence.
              </div>
            ) : null}

            {composer}
          </div>
        </section>

        <aside className="hidden w-[300px] shrink-0 border-l border-[#e7e2da] bg-[#fbfaf7] xl:block">
          <AssistantContextPanel
            onSendPrompt={onSendPrompt}
          />
        </aside>
      </div>
    </div>
  );
}

function AssistantEmptyState({
  onSendPrompt,
}: {
  readonly onSendPrompt: (
    prompt: string,
  ) => Promise<void>;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col justify-center px-4 pb-20 pt-10 sm:px-6 lg:px-10">
        <div className="max-w-2xl">
          <div className="mb-5 flex size-12 items-center justify-center rounded-[16px] bg-[#5146e5] text-white shadow-[0_10px_24px_rgba(81,70,229,0.18)]">
            <SparklesIcon className="size-5" />
          </div>

          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.17em] text-[#8f8794]">
            Autonomous grievance intelligence
          </div>

          <h1 className="text-4xl font-semibold tracking-[-0.055em] text-[#201d26] sm:text-5xl sm:leading-[1.02]">
            What should Resolvia investigate?
          </h1>

          <p className="mt-4 max-w-xl text-sm leading-6 text-[#77707c] sm:text-[15px]">
            Select an investigation below. These are now
            connected directly to the real Eve agent.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <PromptSuggestion
              icon={SearchIcon}
              title="Check a grievance"
              text="What is the current status of GRV-1001?"
              onClick={() =>
                onSendPrompt(
                  "What is the current status of GRV-1001?",
                )
              }
            />

            <PromptSuggestion
              icon={ShieldAlertIcon}
              title="Find escalation risk"
              text="Which grievances should be escalated immediately?"
              onClick={() =>
                onSendPrompt(
                  "Which grievances should be escalated immediately based on severity and waiting time?",
                )
              }
            />

            <PromptSuggestion
              icon={FileTextIcon}
              title="Retrieve policy"
              text="What is the examination appeal process?"
              onClick={() =>
                onSendPrompt(
                  "What is the examination appeal process?",
                )
              }
            />

            <PromptSuggestion
              icon={UsersIcon}
              title="Route a new case"
              text="Which department should handle a scholarship delay?"
              onClick={() =>
                onSendPrompt(
                  "A student's scholarship has been delayed. Which department should handle it, how urgent is it, and should it be escalated?",
                )
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantContextPanel({
  onSendPrompt,
}: {
  readonly onSendPrompt: (
    prompt: string,
  ) => Promise<void>;
}) {
  return (
    <div className="flex h-full flex-col p-5">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a099a4]">
        Investigation context
      </div>

      <div className="mt-3 rounded-[16px] border border-[#e4dfd8] bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-[10px] bg-[#eeecff] text-[#5146e5]">
            <BrainIcon className="size-4" />
          </div>

          <div>
            <div className="text-xs font-semibold">
              Resolution engine
            </div>
            <div className="text-[10px] text-[#948d99]">
              Ready to reason
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2.5">
          <ContextStatus
            icon={CheckCircle2Icon}
            label="Case retrieval"
          />
          <ContextStatus
            icon={CheckCircle2Icon}
            label="Policy search"
          />
          <ContextStatus
            icon={CheckCircle2Icon}
            label="Priority analysis"
          />
          <ContextStatus
            icon={CheckCircle2Icon}
            label="Department routing"
          />
        </div>
      </div>

      <div className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a099a4]">
        Suggested investigations
      </div>

      <div className="mt-3 space-y-2">
        <ContextPrompt
          text="Which grievances are overdue?"
          onClick={() =>
            onSendPrompt(
              "Which grievances are overdue?",
            )
          }
        />

        <ContextPrompt
          text="What cases require human review?"
          onClick={() =>
            onSendPrompt(
              "What cases require human review?",
            )
          }
        />

        <ContextPrompt
          text="Which department is overloaded?"
          onClick={() =>
            onSendPrompt(
              "Which department is receiving the highest number of complaints right now and appears most overloaded?",
            )
          }
        />

        <ContextPrompt
          text="Summarize today's grievance risk"
          onClick={() =>
            onSendPrompt(
              "Summarize the current grievance situation and identify the highest risks.",
            )
          }
        />
      </div>

      <div className="mt-auto rounded-[15px] border border-[#e6e0d9] bg-[#f3f0e8] p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6d6672]">
          <ShieldAlertIcon className="size-3.5" />
          Human oversight
        </div>

        <p className="mt-2 text-[10px] leading-5 text-[#938c97]">
          Sensitive conduct cases are surfaced for human
          review. Resolvia does not make guilt findings.
        </p>
      </div>
    </div>
  );
}

function ContextStatus({
  icon: Icon,
  label,
}: {
  readonly icon: typeof CheckCircle2Icon;
  readonly label: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] bg-[#faf9f6] px-2.5 py-2">
      <div className="flex items-center gap-2 text-[10px] text-[#716a76]">
        <Icon className="size-3.5 text-[#1fa774]" />
        {label}
      </div>

      <span className="text-[10px] font-medium text-[#8f8893]">
        Ready
      </span>
    </div>
  );
}

function ContextPrompt({
  text,
  onClick,
}: {
  readonly text: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      className="w-full rounded-[11px] border border-[#e6e1da] bg-white px-3 py-2.5 text-left text-[10px] leading-4 text-[#716a76] transition hover:border-[#d2cbff] hover:bg-[#f8f7ff] hover:text-[#5146e5]"
      onClick={onClick}
      type="button"
    >
      {text}
    </button>
  );
}

function PromptSuggestion({
  icon: Icon,
  title,
  text,
  onClick,
}: {
  readonly icon: typeof SearchIcon;
  readonly title: string;
  readonly text: string;
  readonly onClick: () => void;
}) {
  return (
    <button
      className="group rounded-[17px] border border-[#e3ddd5] bg-white p-4 text-left shadow-[0_5px_18px_rgba(42,35,51,0.035)] transition hover:-translate-y-0.5 hover:border-[#cfc9ff] hover:shadow-[0_9px_24px_rgba(81,70,229,0.08)]"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-[11px] bg-[#f0efff] text-[#5146e5]">
          <Icon className="size-4" />
        </div>

        <ArrowUpRightIcon className="size-4 text-[#b0a9b4] transition group-hover:text-[#5146e5]" />
      </div>

      <div className="mt-4 text-xs font-semibold">
        {title}
      </div>

      <div className="mt-1 text-[11px] leading-5 text-[#938c97]">
        {text}
      </div>
    </button>
  );
}

function StatusBadge({
  status,
}: {
  readonly status: string;
}) {
  return (
    <span className="inline-flex rounded-full bg-[#f1eee9] px-2.5 py-1 text-[9px] font-semibold text-[#716a76]">
      {status}
    </span>
  );
}

function PriorityBadge({
  priority,
}: {
  readonly priority: string;
}) {
  const styles =
    priority === "Critical"
      ? "bg-[#fff0ec] text-[#d85d4f]"
      : priority === "High"
        ? "bg-[#fff6df] text-[#a56e0a]"
        : priority === "Medium"
          ? "bg-[#f0efff] text-[#6660b3]"
          : "bg-[#edf7f2] text-[#27825f]";

  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-[9px] font-semibold",
        styles,
      )}
    >
      {priority}
    </span>
  );
}

function ComposerAction({
  hasInputText,
  isBusy,
  isResuming,
  onCancel,
}: {
  readonly hasInputText: boolean;
  readonly isBusy: boolean;
  readonly isResuming: boolean;
  readonly onCancel: () => void;
}) {
  const attachments = usePromptInputAttachments();
  const canSubmit =
    hasInputText || attachments.files.length > 0;

  if (!isBusy || canSubmit) {
    return (
      <PromptInputSubmit
        disabled={isResuming}
        className="rounded-full bg-[#5146e5] text-white hover:bg-[#463bd0]"
      />
    );
  }

  return (
    <PromptInputButton
      aria-label="Stop"
      className="rounded-full border-[#d9d2ca] bg-white text-[#5146e5]"
      onClick={onCancel}
      variant="outline"
    >
      <SquareIcon className="size-3 fill-current" />
    </PromptInputButton>
  );
}

function ErrorMessage({
  message,
}: {
  readonly message: string;
}) {
  return (
    <Message className="max-w-full" from="assistant">
      <MessageContent>
        <div
          className="flex w-full items-start gap-3 rounded-[15px] border border-[#efc9c2] bg-[#fff5f2] px-4 py-3 text-sm"
          role="alert"
        >
          <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-[#ffe5df]">
            <AlertCircleIcon className="size-4 text-[#d85d4f]" />
          </div>

          <div>
            <p className="font-semibold text-[#58322d]">
              Investigation interrupted
            </p>

            <p className="mt-1 text-xs leading-5 text-[#8a6660]">
              {message}
            </p>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function PendingThinking() {
  return (
    <Message aria-live="polite" from="assistant">
      <MessageContent>
        <div className="flex items-center gap-3 rounded-[15px] border border-[#e5dfd8] bg-white px-4 py-3 text-sm shadow-[0_4px_16px_rgba(42,35,51,0.035)]">
          <div className="flex size-8 items-center justify-center rounded-full bg-[#eeecff] text-[#5146e5]">
            <BrainIcon className="size-4" />
          </div>

          <div>
            <div className="text-xs font-semibold text-[#5146e5]">
              Resolvia is investigating
            </div>

            <div className="mt-0.5 text-[11px] text-[#978f9b]">
              <Shimmer duration={1}>
                Retrieving context and reasoning...
              </Shimmer>
            </div>
          </div>
        </div>
      </MessageContent>
    </Message>
  );
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Unable to cancel the response.";
}

function getLatestTurnFailure(
  events: ReturnType<typeof useEveAgent>["events"],
): string | undefined {
  for (
    let index = events.length - 1;
    index >= 0;
    index -= 1
  ) {
    const event = events[index];

    if (event.type === "turn.failed") {
      return event.data.code === "MODEL_CALL_FAILED"
        ? "The AI model is temporarily unavailable. Please try again."
        : event.data.message;
    }

    if (
      event.type === "turn.completed" ||
      event.type === "turn.cancelled"
    ) {
      return undefined;
    }

    if (event.type === "message.received") {
      return undefined;
    }
  }

  return undefined;
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function escalationsCount() {
  return grievances.filter(
    (item) =>
      item.priority === "Critical" ||
      item.sensitive ||
      isOverdue(item),
  ).length;
}

function createAnalytics() {
  const open = grievances.filter(
    (item) =>
      item.status !== "Resolved" &&
      item.status !== "Closed",
  );

  const resolved = grievances.filter(
    (item) =>
      item.status === "Resolved" ||
      item.status === "Closed",
  );

  const overdue = grievances.filter(isOverdue);

  const departmentMap = new Map<
    string,
    {
      department: string;
      complaints: number;
      open: number;
      resolved: number;
    }
  >();

  for (const item of grievances) {
    const current = departmentMap.get(item.department) ?? {
      department: item.department,
      complaints: 0,
      open: 0,
      resolved: 0,
    };

    current.complaints += 1;

    if (
      item.status === "Resolved" ||
      item.status === "Closed"
    ) {
      current.resolved += 1;
    } else {
      current.open += 1;
    }

    departmentMap.set(item.department, current);
  }

  return {
    total: grievances.length,
    open: open.length,
    resolved: resolved.length,
    overdue: overdue.length,
    escalations: escalationsCount(),
    averageResolutionHours:
      resolved.length === 0
        ? 0
        : Math.round(
            resolved.reduce(
              (sum, item) =>
                sum + calculateWaitingHours(item),
              0,
            ) / resolved.length,
          ),
    departments: Array.from(
      departmentMap.values(),
    ).sort(
      (a, b) =>
        b.complaints - a.complaints,
    ),
  };
}
