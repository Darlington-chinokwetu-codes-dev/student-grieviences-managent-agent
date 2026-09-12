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
import { useState } from "react";

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
import { cn } from "@/lib/utils";
import { AgentMessage } from "./agent-message";

const AGENT_NAME = "Resolvia AI";

type ViewMode = "overview" | "assistant";

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

const workspaceItems = [
  {
    label: "Grievances",
    icon: ClipboardListIcon,
    count: "24",
  },
  {
    label: "Students",
    icon: UsersIcon,
  },
  {
    label: "Escalations",
    icon: ShieldAlertIcon,
    count: "4",
    alert: true,
  },
  {
    label: "Analytics",
    icon: SearchIcon,
  },
];

const attentionItems = [
  {
    id: "GRV-1001",
    title: "Scholarship disbursement delayed",
    meta: "Financial Aid",
    priority: "Critical",
    sla: "2h left",
  },
  {
    id: "GRV-1048",
    title: "Examination appeal awaiting review",
    meta: "Examinations",
    priority: "High",
    sla: "6h left",
  },
  {
    id: "GRV-1062",
    title: "Hostel maintenance unresolved",
    meta: "Facilities",
    priority: "Medium",
    sla: "18h left",
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

  const isBusy = agent.status === "submitted" || agent.status === "streaming";
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
    isBusy || isResuming ? undefined : getLatestTurnFailure(agent.events);

  const errorMessage =
    cancellationError ?? agent.error?.message ?? turnFailure;

  const hasConversationContent =
    sessionless || !isEmpty || errorMessage !== undefined;

  const showConversationLayout = isResuming || hasConversationContent;
  const activeSessionId = sessionId ?? agent.session?.sessionId;

  const requestCancellation = () => {
    setCancellationError(undefined);

    void agent.cancel().catch((error: unknown) => {
      setCancellationError(toErrorMessage(error));
    });
  };

  const handleSubmit = async (message: PromptInputMessage) => {
    const text = message.text.trim();

    if (
      (text.length === 0 && message.files.length === 0) ||
      isResuming
    ) {
      return;
    }

    setHasInputText(false);
    setCancellationError(undefined);

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

            <span>Grievance data protected</span>
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
            onOpenAssistant={() => setViewMode("assistant")}
          />
        ) : (
          <AssistantWorkspace
            composer={composer}
            isEmpty={isEmpty}
            isPendingAssistantShell={isPendingAssistantShell}
            showConversationLayout={showConversationLayout}
            showPendingThinking={showPendingThinking}
            errorMessage={errorMessage}
            agent={agent}
            sessionId={sessionId}
            activeSessionId={activeSessionId}
            isBusy={isBusy}
            isResuming={isResuming}
            onCancellationReset={() =>
              setCancellationError(undefined)
            }
          />
        )}
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
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex h-full flex-col px-4 py-5">
          <div className="mb-7 flex items-center justify-between px-2">
            <button
              className="flex items-center gap-3 text-left"
              onClick={() => onViewChange("overview")}
              type="button"
            >
              <div className="relative flex size-10 items-center justify-center rounded-[13px] bg-[#5146e5] text-white shadow-[0_7px_16px_rgba(81,70,229,0.24)]">
                <span className="text-sm font-bold tracking-tight">R</span>
                <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full border-2 border-[#fcfbf8] bg-[#f97362]" />
              </div>

              <div>
                <div className="text-[16px] font-semibold tracking-[-0.02em]">
                  Resolvia
                </div>
                <div className="text-[11px] uppercase tracking-[0.15em] text-[#938d99]">
                  Student Affairs AI
                </div>
              </div>
            </button>

            <button
              aria-label="Close menu"
              className="rounded-lg p-2 text-[#8b8492] hover:bg-[#f1eee8] lg:hidden"
              onClick={onClose}
              type="button"
            >
              ×
            </button>
          </div>

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
                  onClick={() => onViewChange(item.id)}
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
            {workspaceItems.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left text-sm text-[#67616e] transition hover:bg-[#f2efe9]"
                  type="button"
                >
                  <Icon className="size-[17px]" />
                  <span>{item.label}</span>

                  {item.count ? (
                    <span
                      className={cn(
                        "ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        item.alert
                          ? "bg-[#fff0ec] text-[#d85d4f]"
                          : "bg-[#f0ede8] text-[#827b88]",
                      )}
                    >
                      {item.count}
                    </span>
                  ) : null}
                </button>
              );
            })}
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
          {activeView === "assistant"
            ? "Resolution command center"
            : "Institution overview"}
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-[#dfdad2] bg-white px-3 py-1.5 text-[11px] font-medium text-[#6f6875] sm:flex">
          <span className="size-1.5 rounded-full bg-[#1fa774]" />
          Live demo environment
        </div>

        {activeView === "overview" ? (
          <Button
            className="hidden rounded-full border-[#ddd7cf] bg-white text-[#58515f] shadow-none hover:bg-[#f3f0ea] sm:inline-flex"
            onClick={() => onViewChange("assistant")}
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
            onClick={() => window.location.assign("/s")}
            size="sm"
            type="button"
          >
            <PlusIcon className="size-4" />
            <span className="hidden sm:inline">New investigation</span>
          </Button>
        ) : null}
      </div>
    </header>
  );
}

function Overview({
  onOpenAssistant,
}: {
  readonly onOpenAssistant: () => void;
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
                Resolvia understands a grievance, retrieves the relevant
                context and policy, evaluates urgency, recommends ownership,
                and surfaces escalation risk.
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
                  onClick={onOpenAssistant}
                  type="button"
                  variant="outline"
                >
                  Ask a policy question
                </Button>
              </div>
            </div>
          </section>

          <section className="rounded-[24px] border border-[#ddd7cf] bg-[#201d26] p-6 text-white shadow-[0_12px_34px_rgba(32,29,38,0.15)]">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-white/45">
                  Today's pulse
                </div>
                <div className="mt-1 text-lg font-semibold">
                  Institutional risk
                </div>
              </div>

              <div className="flex size-9 items-center justify-center rounded-full bg-white/8">
                <FlagIcon className="size-4 text-[#f7a090]" />
              </div>
            </div>

            <div className="mt-7 grid grid-cols-2 gap-3">
              <MetricCard
                label="Open cases"
                value="24"
                detail="6 new today"
              />
              <MetricCard
                label="SLA at risk"
                value="4"
                detail="Needs attention"
              />
              <MetricCard
                label="Escalations"
                value="3"
                detail="1 critical"
              />
              <MetricCard
                label="Resolved"
                value="17"
                detail="+12% this week"
              />
            </div>
          </section>
        </div>

        <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.8fr)]">
          <section className="rounded-[24px] border border-[#ddd7cf] bg-white shadow-[0_10px_36px_rgba(42,35,51,0.05)]">
            <div className="flex items-center justify-between border-b border-[#eee9e2] px-5 py-4 sm:px-6">
              <div>
                <div className="text-[15px] font-semibold">
                  Attention queue
                </div>
                <div className="mt-0.5 text-xs text-[#928b97]">
                  Cases most likely to breach service commitments
                </div>
              </div>

              <div className="rounded-full bg-[#fff0ec] px-2.5 py-1 text-[10px] font-semibold text-[#d85d4f]">
                4 at risk
              </div>
            </div>

            <div className="divide-y divide-[#eee9e2]">
              {attentionItems.map((item) => (
                <AttentionRow item={item} key={item.id} />
              ))}
            </div>
          </section>

          <section className="rounded-[24px] border border-[#ddd7cf] bg-white p-5 shadow-[0_10px_36px_rgba(42,35,51,0.05)] sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-[11px] bg-[#eeecff] text-[#5146e5]">
                <BrainIcon className="size-4.5" />
              </div>

              <div>
                <div className="text-[15px] font-semibold">
                  Decision engine
                </div>
                <div className="text-xs text-[#928b97]">
                  What Resolvia can reason over
                </div>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <CapabilityRow
                title="Case context"
                description="Student and grievance history"
              />
              <CapabilityRow
                title="Institutional policy"
                description="Relevant rules and escalation paths"
              />
              <CapabilityRow
                title="Priority analysis"
                description="Urgency, impact and SLA risk"
              />
              <CapabilityRow
                title="Routing"
                description="Recommended department and next action"
              />
            </div>

            <div className="mt-5 border-t border-[#eee9e2] pt-4 text-[11px] leading-5 text-[#958e9a]">
              Demonstration environment. Decisions shown here are simulated
              institutional data for judging purposes.
            </div>
          </section>
        </div>
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
}: {
  readonly composer: React.ReactNode;
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
}) {
  return (
    <div className="relative min-h-0 flex-1 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(81,70,229,0.06),transparent_30%)]" />

      <div className="relative flex h-full min-h-0">
        <section className="flex min-w-0 flex-1 flex-col">
          {!showConversationLayout ? (
            <AssistantEmptyState />
          ) : (
            <Conversation
              className="min-h-0 flex-1"
              initial={sessionId === undefined ? undefined : false}
              resize={activeSessionId === undefined ? "smooth" : "instant"}
              scrollRestorationKey={
                isEmpty || activeSessionId === undefined
                  ? undefined
                  : `eve:web-chat-scroll:${activeSessionId}`
              }
            >
              <ConversationTopFade className="top-0" />

              <ConversationContent className="mx-auto w-full max-w-4xl gap-5 px-4 pb-40 pt-7 sm:px-6 lg:px-10">
                {agent.data.messages.map((message, index) =>
                  showPendingThinking &&
                  isPendingAssistantShell &&
                  message.id === agent.data.messages.at(-1)?.id ? null : (
                    <AgentMessage
                      canRespond={!isBusy && !isResuming}
                      isStreaming={
                        agent.status === "streaming" &&
                        index === agent.data.messages.length - 1
                      }
                      key={message.id}
                      message={message}
                      onInputResponses={(inputResponses) => {
                        onCancellationReset();
                        return agent.respond(inputResponses);
                      }}
                    />
                  ),
                )}

                {showPendingThinking ? <PendingThinking /> : null}
                {errorMessage ? (
                  <ErrorMessage message={errorMessage} />
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
                Resolvia may ask follow-up questions when case evidence is
                incomplete.
              </div>
            ) : null}

            {composer}
          </div>
        </section>

        <aside className="hidden w-[300px] shrink-0 border-l border-[#e7e2da] bg-[#fbfaf7] xl:block">
          <AssistantContextPanel />
        </aside>
      </div>
    </div>
  );
}

function AssistantEmptyState() {
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
            Ask about a grievance, identify the responsible department,
            evaluate SLA risk, retrieve policy, or determine which cases
            deserve escalation.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <PromptSuggestion
              icon={SearchIcon}
              title="Check a grievance"
              text="What is the current status of GRV-1001?"
            />
            <PromptSuggestion
              icon={ShieldAlertIcon}
              title="Find escalation risk"
              text="Which open grievance is most urgent?"
            />
            <PromptSuggestion
              icon={FileTextIcon}
              title="Retrieve policy"
              text="What is the exam appeal process?"
            />
            <PromptSuggestion
              icon={UsersIcon}
              title="Route a case"
              text="Which department should handle a scholarship delay?"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function AssistantContextPanel() {
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
            status="Ready"
          />
          <ContextStatus
            icon={CheckCircle2Icon}
            label="Policy search"
            status="Ready"
          />
          <ContextStatus
            icon={CheckCircle2Icon}
            label="Priority analysis"
            status="Ready"
          />
          <ContextStatus
            icon={CheckCircle2Icon}
            label="Department routing"
            status="Ready"
          />
        </div>
      </div>

      <div className="mt-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a099a4]">
        Suggested investigations
      </div>

      <div className="mt-3 space-y-2">
        <ContextPrompt text="Which grievances are overdue?" />
        <ContextPrompt text="What cases require human review?" />
        <ContextPrompt text="Which department is overloaded?" />
        <ContextPrompt text="Summarize today's grievance risk." />
      </div>

      <div className="mt-auto rounded-[15px] border border-[#e6e0d9] bg-[#f3f0e8] p-3.5">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-[#6d6672]">
          <ShieldAlertIcon className="size-3.5" />
          Human oversight
        </div>

        <p className="mt-2 text-[10px] leading-5 text-[#938c97]">
          Sensitive conduct cases are surfaced for human review. Resolvia
          does not make guilt findings or replace institutional decision
          makers.
        </p>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  detail,
}: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <div className="rounded-[15px] border border-white/10 bg-white/[0.06] p-3.5">
      <div className="text-[10px] uppercase tracking-[0.12em] text-white/45">
        {label}
      </div>

      <div className="mt-2 text-2xl font-semibold tracking-[-0.04em]">
        {value}
      </div>

      <div className="mt-0.5 text-[10px] text-white/45">
        {detail}
      </div>
    </div>
  );
}

function AttentionRow({
  item,
}: {
  readonly item: (typeof attentionItems)[number];
}) {
  return (
    <div className="flex gap-4 px-5 py-4 sm:px-6">
      <div
        className={cn(
          "mt-1 h-9 w-1 shrink-0 rounded-full",
          item.priority === "Critical"
            ? "bg-[#f97362]"
            : item.priority === "High"
              ? "bg-[#e3a126]"
              : "bg-[#8e83d9]",
        )}
      />

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] font-semibold text-[#8a8390]">
            {item.id}
          </span>

          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[9px] font-semibold",
              item.priority === "Critical"
                ? "bg-[#fff0ec] text-[#d85d4f]"
                : item.priority === "High"
                  ? "bg-[#fff6df] text-[#a56e0a]"
                  : "bg-[#f0efff] text-[#6660b3]",
            )}
          >
            {item.priority}
          </span>
        </div>

        <div className="mt-1.5 truncate text-sm font-semibold text-[#2d2932]">
          {item.title}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#958e9a]">
          <span>{item.meta}</span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <Clock3Icon className="size-3" />
            {item.sla}
          </span>
        </div>
      </div>

      <button
        className="hidden self-center rounded-full border border-[#e1dbd3] px-3 py-1.5 text-[10px] font-semibold text-[#655e6b] hover:bg-[#f5f2ed] sm:block"
        type="button"
      >
        Review
      </button>
    </div>
  );
}

function CapabilityRow({
  title,
  description,
}: {
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="flex gap-3 rounded-[13px] border border-[#eee9e2] bg-[#fcfbf8] p-3">
      <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-[#efede8] text-[#6d6672]">
        <CheckCircle2Icon className="size-3.5" />
      </div>

      <div className="min-w-0">
        <div className="text-xs font-semibold">{title}</div>
        <div className="mt-0.5 text-[10px] leading-4 text-[#928b97]">
          {description}
        </div>
      </div>
    </div>
  );
}

function ContextStatus({
  icon: Icon,
  label,
  status,
}: {
  readonly icon: typeof CheckCircle2Icon;
  readonly label: string;
  readonly status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-[10px] bg-[#faf9f6] px-2.5 py-2">
      <div className="flex items-center gap-2 text-[10px] text-[#716a76]">
        <Icon className="size-3.5 text-[#1fa774]" />
        {label}
      </div>

      <span className="text-[10px] font-medium text-[#8f8893]">
        {status}
      </span>
    </div>
  );
}

function ContextPrompt({ text }: { readonly text: string }) {
  return (
    <button
      className="w-full rounded-[11px] border border-[#e6e1da] bg-white px-3 py-2.5 text-left text-[10px] leading-4 text-[#716a76] transition hover:border-[#d2cbff] hover:bg-[#f8f7ff] hover:text-[#5146e5]"
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
}: {
  readonly icon: typeof SearchIcon;
  readonly title: string;
  readonly text: string;
}) {
  return (
    <button
      className="group rounded-[17px] border border-[#e3ddd5] bg-white p-4 text-left shadow-[0_5px_18px_rgba(42,35,51,0.035)] transition hover:-translate-y-0.5 hover:border-[#cfc9ff] hover:shadow-[0_9px_24px_rgba(81,70,229,0.08)]"
      type="button"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex size-9 items-center justify-center rounded-[11px] bg-[#f0efff] text-[#5146e5]">
          <Icon className="size-4" />
        </div>

        <ArrowUpRightIcon className="size-4 text-[#b0a9b4] transition group-hover:text-[#5146e5]" />
      </div>

      <div className="mt-4 text-xs font-semibold">{title}</div>
      <div className="mt-1 text-[11px] leading-5 text-[#938c97]">
        {text}
      </div>
    </button>
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
  const canSubmit = hasInputText || attachments.files.length > 0;

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
              <Shimmer duration={1}>Retrieving context and reasoning...</Shimmer>
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
  for (let index = events.length - 1; index >= 0; index -= 1) {
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
