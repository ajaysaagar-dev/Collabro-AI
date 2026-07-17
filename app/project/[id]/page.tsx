"use client";

import { useEffect, useState, useRef, useCallback, use } from "react";
import Link from "next/link";
import type {
  ProjectState,
  PipelineEvent,
  PhaseProgress,
  PipelinePhase,
  AgentRole,
  GeneratedFile,
} from "@/types";
import { AGENT_REGISTRY } from "@/types";
import Terminal from "@/components/terminal/Terminal";
import ProgressPanel from "@/components/dashboard/ProgressPanel";
import AgentStatusCard from "@/components/dashboard/AgentStatusCard";

// ─── Pipeline phase defaults ────────────────────────────────────────────────

const PIPELINE_PHASES: PipelinePhase[] = [
  "prompt-analysis",
  "requirements-validation",
  "architecture-design",
  "content-planning",
  "task-scheduling",
  "implementation",
  "testing",
  "documentation",
  "deployment",
];

const defaultPhases: PhaseProgress[] = PIPELINE_PHASES.map((phase) => ({
  phase,
  status: "pending" as const,
  progress: 0,
}));

// ─── Elapsed time formatter ─────────────────────────────────────────────────

function useElapsedTime(startedAt: number | null) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
}

// ─── Status badge ───────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ProjectState["status"] }) {
  const styles: Record<ProjectState["status"], string> = {
    initializing: "bg-neon-amber/15 text-neon-amber border-neon-amber/30",
    running: "bg-neon-indigo/15 text-neon-indigo border-neon-indigo/30",
    completed: "bg-neon-emerald/15 text-neon-emerald border-neon-emerald/30",
    failed: "bg-neon-rose/15 text-neon-rose border-neon-rose/30",
    partial_success: "bg-neon-emerald/15 text-teal-400 border-teal-500/30",
    stalled: "bg-neon-rose/15 text-orange-400 border-orange-500/30",
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-mono font-semibold uppercase tracking-wider ${styles[status]}`}
    >
      {status === "running" && (
        <span className="w-1.5 h-1.5 rounded-full bg-neon-indigo animate-pulse" />
      )}
      {status}
    </span>
  );
}

// ─── File Viewer ────────────────────────────────────────────────────────────

interface TreeNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children: Record<string, TreeNode>;
  fileData?: GeneratedFile;
}

function buildFileTree(files: GeneratedFile[]): TreeNode {
  const root: TreeNode = { name: "root", path: "", type: "folder", children: {} };

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;
      const currentPath = parts.slice(0, i + 1).join("/");

      if (!current.children[part]) {
        current.children[part] = {
          name: part,
          path: currentPath,
          type: isLast ? "file" : "folder",
          children: {},
          fileData: isLast ? file : undefined,
        };
      }
      current = current.children[part];
    }
  }

  return root;
}

interface FileTreeNodeProps {
  node: TreeNode;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  depth: number;
}

function FileTreeNode({ node, selectedFile, onSelectFile, depth = 0 }: FileTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const sortedChildren = Object.values(node.children).sort((a, b) => {
    if (a.type !== b.type) {
      return a.type === "folder" ? -1 : 1;
    }
    return a.name.localeCompare(b.name);
  });

  if (node.type === "file") {
    const isSelected = selectedFile === node.path;
    return (
      <button
        onClick={() => onSelectFile(node.path)}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        className={`w-full text-left py-1.5 pr-3 text-[11px] font-mono truncate transition-colors cursor-pointer flex items-center gap-1.5 ${
          isSelected
            ? "bg-neon-indigo/10 text-neon-indigo font-bold border-l border-neon-indigo"
            : "text-muted hover:text-foreground hover:bg-white/[0.02]"
        }`}
      >
        <span>📄</span>
        <span className="truncate">{node.name}</span>
      </button>
    );
  }

  return (
    <div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        style={{ paddingLeft: `${depth * 12 + 12}px` }}
        className="w-full text-left py-1.5 pr-3 text-[11px] font-mono text-dim hover:text-foreground hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center justify-between"
      >
        <span className="flex items-center gap-1.5 truncate">
          <span>{isExpanded ? "📂" : "📁"}</span>
          <span className="truncate font-semibold text-foreground/90">{node.name}</span>
        </span>
        <span className="text-[9px] text-muted shrink-0 pr-1">{isExpanded ? "▼" : "▶"}</span>
      </button>
      {isExpanded && (
        <div className="border-l border-border/10 ml-3">
          {sortedChildren.map((child) => (
            <FileTreeNode
              key={child.path}
              node={child}
              selectedFile={selectedFile}
              onSelectFile={onSelectFile}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FileViewer({ files }: { files: GeneratedFile[] }) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  if (files.length === 0) return null;

  const activeFile = files.find((f) => f.path === selectedFile);
  const rootNode = buildFileTree(files);
  const sortedRootChildren = Object.values(rootNode.children).sort((a, b) => {
    if (a.type !== b.type) return a.type === "folder" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-[#0a0a0a]">
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-2.5 bg-surface/60 border-b border-border/40 hover:bg-surface/80 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📁</span>
          <span className="text-xs font-semibold text-foreground">
            Generated Workspace Tree (Folders Collapsed by Default)
          </span>
          <span className="text-[10px] text-muted font-mono">
            ({files.length})
          </span>
        </div>
        <span className="text-xs text-muted">{isCollapsed ? "▸" : "▾"}</span>
      </button>

      {!isCollapsed && (
        <div className="flex h-80">
          {/* File tree */}
          <div className="w-64 border-r border-border/30 overflow-y-auto terminal-scroll shrink-0 py-2">
            {sortedRootChildren.map((node) => (
              <FileTreeNode
                key={node.path}
                node={node}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                depth={0}
              />
            ))}
          </div>

          {/* Code viewer */}
          <div className="flex-1 overflow-auto terminal-scroll p-4 bg-[#050505]">
            {activeFile ? (
              <pre className="text-[12px] text-foreground/85 font-mono whitespace-pre leading-relaxed">
                {activeFile.content}
              </pre>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-muted">
                Select a file from the workspace tree to view its contents
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const [phases, setPhases] = useState<PhaseProgress[]>(defaultPhases);
  const [currentPhase, setCurrentPhase] = useState<PipelinePhase>("prompt-analysis");
  const [projectStatus, setProjectStatus] = useState<ProjectState["status"]>("initializing");
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [activeAgents, setActiveAgents] = useState<Set<AgentRole>>(new Set());
  const [completedAgents, setCompletedAgents] = useState<Set<AgentRole>>(new Set());
  const [startedAt] = useState(() => Date.now());
  const [connected, setConnected] = useState(false);

  const elapsed = useElapsedTime(startedAt);
  const eventSourceRef = useRef<EventSource | null>(null);
  const connectSSERef = useRef<() => void>(() => {});

  // ─── SSE Connection ─────────────────────────────────────────────────────

  const connectSSE = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    const es = new EventSource(`/api/project/${id}/stream`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        // State sync event
        if (data.type === "state-sync" && data.project) {
          const project: ProjectState = data.project;
          setPhases(project.phases);
          setCurrentPhase(project.currentPhase);
          setProjectStatus(project.status);
          setGeneratedFiles(project.generatedFiles || []);
          if (project.events) {
            setEvents(project.events);
          }
          return;
        }

        // Pipeline event
        const event = data as PipelineEvent;
        setEvents((prev) => [...prev, event]);

        // Update tracking based on event type
        switch (event.type) {
          case "phase-start":
            setCurrentPhase(event.phase);
            setPhases((prev) =>
              prev.map((p) =>
                p.phase === event.phase
                  ? { ...p, status: "running", startedAt: event.timestamp }
                  : p
              )
            );
            break;

          case "phase-complete":
            setPhases((prev) =>
              prev.map((p) =>
                p.phase === event.phase
                  ? { ...p, status: "completed", progress: 100, completedAt: event.timestamp }
                  : p
              )
            );
            break;

          case "phase-error":
            setPhases((prev) =>
              prev.map((p) =>
                p.phase === event.phase ? { ...p, status: "failed" } : p
              )
            );
            break;

          case "agent-start":
            setActiveAgents((prev) => new Set(prev).add(event.agent));
            break;

          case "agent-complete":
            setActiveAgents((prev) => {
              const next = new Set(prev);
              next.delete(event.agent);
              return next;
            });
            setCompletedAgents((prev) => new Set(prev).add(event.agent));
            break;

          case "agent-error":
            setActiveAgents((prev) => {
              const next = new Set(prev);
              next.delete(event.agent);
              return next;
            });
            break;

          case "progress-update":
            if (event.data?.progress !== undefined) {
              setPhases((prev) =>
                prev.map((p) =>
                  p.phase === event.phase
                    ? { ...p, progress: Number(event.data!.progress) }
                    : p
                )
              );
            }
            break;

          case "file-generated":
            if (event.data?.path && event.data?.content) {
              setGeneratedFiles((prev) => [
                ...prev,
                {
                  path: String(event.data!.path),
                  content: String(event.data!.content),
                  agent: event.agent,
                  generatedAt: event.timestamp,
                },
              ]);
            }
            break;
        }

        // Check for terminal states
        if (
          event.phase === "completed" &&
          (event.type === "phase-complete" || event.type === "phase-start")
        ) {
          setProjectStatus("completed");
        }
      } catch {
        // Silently skip parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      setTimeout(() => connectSSERef.current(), 3000);
    };
  }, [id]);

  useEffect(() => {
    connectSSERef.current = connectSSE;
    connectSSE();
    return () => {
      eventSourceRef.current?.close();
    };
  }, [connectSSE]);

  // ─── Agent status helper ────────────────────────────────────────────────

  function getAgentStatus(role: AgentRole): "idle" | "active" | "completed" {
    if (activeAgents.has(role)) return "active";
    if (completedAgents.has(role)) return "completed";
    return "idle";
  }

  const agents = Object.values(AGENT_REGISTRY);

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top Bar */}
      <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/50 bg-surface/40 glass-strong shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted hover:text-foreground transition-colors group"
          >
            <span className="text-sm font-black gradient-text group-hover:opacity-80 transition-opacity">
              C
            </span>
            <span className="text-xs font-mono text-dim hidden sm:inline">←</span>
          </Link>

          <div className="h-4 w-px bg-border/50" />

          <div className="flex items-center gap-3">
            <span className="text-[11px] font-mono text-muted">
              project/{id.slice(0, 8)}
            </span>
            <StatusBadge status={projectStatus} />
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Download button when completed */}
          {(projectStatus === "completed" || projectStatus === "partial_success" || projectStatus === "stalled") && (
            <a
              href={`/api/project/${id}/download`}
              className="px-3 py-1 bg-gradient-to-r from-neon-indigo to-neon-violet hover:opacity-90 text-white font-mono text-xs font-semibold rounded-md flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(129,140,248,0.2)] animate-fade-in"
            >
              📥 Download ZIP
            </a>
          )}

          {/* Connection indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-1.5 h-1.5 rounded-full ${
                connected ? "bg-neon-emerald animate-pulse" : "bg-neon-rose"
              }`}
            />
            <span className="text-[10px] text-dim font-mono hidden sm:inline">
              {connected ? "live" : "reconnecting"}
            </span>
          </div>

          {/* Elapsed time */}
          <span className="text-xs font-mono text-muted tabular-nums">
            ⏱ {elapsed}
          </span>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Terminal Panel (left / main) */}
        <div className="flex-1 flex flex-col p-3 sm:p-4 min-h-0 min-w-0">
          <div className="flex-1 min-h-0">
            <Terminal events={events} />
          </div>

          {/* File Viewer (below terminal) */}
          <div className="mt-3">
            <FileViewer files={generatedFiles} />
          </div>
        </div>

        {/* Sidebar (right) */}
        <aside className="w-full lg:w-80 xl:w-96 border-t lg:border-t-0 lg:border-l border-border/30 p-3 sm:p-4 overflow-y-auto terminal-scroll shrink-0">
          {/* Progress Panel */}
          <ProgressPanel phases={phases} currentPhase={currentPhase} />

          {/* Agent Status */}
          <div className="mt-4">
            <div className="glass rounded-xl overflow-hidden neon-border-indigo">
              <div className="px-4 py-2.5 border-b border-border/40">
                <span className="text-[11px] text-muted font-mono uppercase tracking-wider">
                  Agent Status
                </span>
              </div>
              <div className="p-2 space-y-1.5">
                {agents.map((agent) => (
                  <AgentStatusCard
                    key={agent.role}
                    agent={agent}
                    status={getAgentStatus(agent.role)}
                  />
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
