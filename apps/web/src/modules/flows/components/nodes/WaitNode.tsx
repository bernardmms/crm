import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Clock } from "lucide-react";

export type WaitConfig =
  | { mode: "duration"; value: number; unit: "minutes" | "hours" | "days" }
  | { mode: "until"; at: string };

function formatWait(config: WaitConfig): string {
  if (config.mode === "until") {
    return `Until ${new Date(config.at).toLocaleString()}`;
  }
  const units: Record<string, string> = {
    minutes: "min",
    hours: "h",
    days: config.value === 1 ? "day" : "days",
  };
  return `Wait ${config.value} ${units[config.unit] ?? config.unit}`;
}

export function WaitNode({ data, selected }: NodeProps) {
  const config = (data.config ?? {}) as Partial<WaitConfig>;
  const isConfigured = config.mode != null;

  return (
    <div
      className={`rounded-lg border-2 bg-background p-3 shadow-sm w-52 ${
        selected ? "border-primary" : "border-border"
      } ${!isConfigured ? "border-dashed" : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-md bg-orange-100 p-1.5">
          <Clock className="h-4 w-4 text-orange-600" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Wait
        </span>
      </div>
      {isConfigured ? (
        <p className="text-sm font-medium">{formatWait(config as WaitConfig)}</p>
      ) : (
        <p className="text-sm text-muted-foreground italic">Click to configure…</p>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
