import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Bot, List } from "lucide-react";

export type AiAgentParams = {
  industry: string;
  geo: string;
  produto: string;
  target_titles?: string[];
  company_size?: string;
  max_leads?: number;
  min_score?: number;
  dry_run?: boolean;
};

export type AiAgentRunStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";

export type ListSourceConfig =
  | {
      mode?: "LIST";
      contactListId?: string;
      contactListName?: string;
    }
  | {
      mode: "AI_AGENT";
      agentParams?: AiAgentParams;
      aiAgentRunId?: string;
      aiAgentRunStatus?: AiAgentRunStatus;
      contactListId?: string;
      contactListName?: string;
      runIndex?: number;
      failureReason?: string;
    };

const RUN_STATUS_LABEL: Record<AiAgentRunStatus, string> = {
  pending: "Pending…",
  running: "Running…",
  completed: "Completed",
  failed: "Failed",
  cancelled: "Cancelled",
};

export function ListSourceNode({ data, selected }: NodeProps) {
  const config = (data.config ?? {}) as ListSourceConfig;
  const mode = (config as { mode?: string }).mode ?? "LIST";

  const Icon = mode === "AI_AGENT" ? Bot : List;
  const accent = mode === "AI_AGENT" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600";
  const label = mode === "AI_AGENT" ? "AI Agent Run" : "Contact List";

  return (
    <div
      className={`rounded-lg border-2 bg-background p-3 shadow-sm w-52 ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className={`rounded-md p-1.5 ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          {label}
        </span>
      </div>

      {mode === "AI_AGENT" ? (
        <AiAgentSummary config={config as Extract<ListSourceConfig, { mode: "AI_AGENT" }>} />
      ) : (
        <p className="text-sm font-medium truncate">
          {config.contactListName ?? (
            <span className="text-muted-foreground italic">Select a list…</span>
          )}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

function AiAgentSummary({
  config,
}: {
  config: Extract<ListSourceConfig, { mode: "AI_AGENT" }>;
}) {
  const params = config.agentParams;
  const status = config.aiAgentRunStatus;

  if (!params || !params.industry || !params.geo || !params.produto) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Configure AI parameters…
      </p>
    );
  }

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium truncate" title={params.produto}>
        {params.produto}
      </p>
      <p className="text-xs text-muted-foreground truncate" title={`${params.industry} • ${params.geo}`}>
        {params.industry} • {params.geo}
      </p>
      {status && (
        <p
          className={`text-xs font-medium ${
            status === "failed" || status === "cancelled"
              ? "text-red-600"
              : status === "completed"
                ? "text-green-600"
                : "text-amber-600"
          }`}
        >
          {RUN_STATUS_LABEL[status]}
        </p>
      )}
    </div>
  );
}
