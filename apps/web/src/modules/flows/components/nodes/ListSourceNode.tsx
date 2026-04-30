import { Handle, Position, type NodeProps } from "@xyflow/react";
import { List } from "lucide-react";

export type ListSourceConfig = {
  contactListId?: string;
  contactListName?: string;
};

export function ListSourceNode({ data, selected }: NodeProps) {
  const config = (data.config ?? {}) as ListSourceConfig;

  return (
    <div
      className={`rounded-lg border-2 bg-background p-3 shadow-sm w-52 ${
        selected ? "border-primary" : "border-border"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="rounded-md bg-blue-100 p-1.5">
          <List className="h-4 w-4 text-blue-600" />
        </div>
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Contact List
        </span>
      </div>
      <p className="text-sm font-medium truncate">
        {config.contactListName ?? (
          <span className="text-muted-foreground italic">Select a list…</span>
        )}
      </p>
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
