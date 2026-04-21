import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Mail } from "lucide-react";

export type SendEmailConfig = {
  name?: string;
  subject?: string;
  htmlContent?: string;
};

export function SendEmailNode({ data, selected }: NodeProps) {
  const config = (data.config ?? {}) as SendEmailConfig;
  const isConfigured = Boolean(config.subject && config.htmlContent);

  return (
    <div
      className={`rounded-lg border-2 bg-background p-3 shadow-sm w-52 ${
        selected ? "border-primary" : "border-border"
      } ${!isConfigured ? "border-dashed" : ""}`}
    >
      <Handle type="target" position={Position.Top} />
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-md bg-green-100 p-1.5">
          <Mail className="h-4 w-4 text-green-600" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Send Email
        </span>
      </div>
      {isConfigured ? (
        <>
          <p className="text-sm font-medium truncate">{config.name || "Email"}</p>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {config.subject}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground italic">Click to configure…</p>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
