import { Button } from "@repo/ui/components/ui/button";
import { X } from "lucide-react";
import { ListSourceConfigPanel } from "./config/ListSourceConfig";
import { SendEmailConfigPanel } from "./config/SendEmailConfig";
import { WaitConfigPanel } from "./config/WaitConfig";
import type { ListSourceConfig } from "./nodes/ListSourceNode";
import type { SendEmailConfig } from "./nodes/SendEmailNode";
import type { WaitConfig } from "./nodes/WaitNode";

export type FlowNodeData = {
  id: string;
  type: "LIST_SOURCE" | "SEND_EMAIL" | "WAIT";
  config: Record<string, unknown>;
};

interface Props {
  node: FlowNodeData;
  onConfigChange: (nodeId: string, config: Record<string, unknown>) => void;
  onClose: () => void;
}

const TYPE_LABELS: Record<FlowNodeData["type"], string> = {
  LIST_SOURCE: "Contact List",
  SEND_EMAIL: "Send Email",
  WAIT: "Wait",
};

export function NodeConfigPanel({ node, onConfigChange, onClose }: Props) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold text-sm">{TYPE_LABELS[node.type]}</h3>
        <Button size="icon" variant="ghost" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {node.type === "LIST_SOURCE" && (
          <ListSourceConfigPanel
            config={node.config as ListSourceConfig}
            onChange={(cfg) => onConfigChange(node.id, cfg)}
          />
        )}
        {node.type === "SEND_EMAIL" && (
          <SendEmailConfigPanel
            config={node.config as SendEmailConfig}
            onChange={(cfg) => onConfigChange(node.id, cfg)}
          />
        )}
        {node.type === "WAIT" && (
          <WaitConfigPanel
            config={node.config as Partial<WaitConfig>}
            onChange={(cfg) => onConfigChange(node.id, cfg)}
          />
        )}
      </div>
    </div>
  );
}
