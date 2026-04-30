import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { flowWithNodesSchema } from "@repo/api-contract";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Background,
  Controls,
  MiniMap,
  type Connection,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Mail,
  Pause,
  Play,
  Save,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
function uuidv4() {
  return crypto.randomUUID();
}
import type z from "zod";
import { NodeConfigPanel, type FlowNodeData } from "../components/NodeConfigPanel";
import { ListSourceNode } from "../components/nodes/ListSourceNode";
import { SendEmailNode } from "../components/nodes/SendEmailNode";
import { WaitNode } from "../components/nodes/WaitNode";

type FlowRecord = z.infer<typeof flowWithNodesSchema>;

const nodeTypes = {
  LIST_SOURCE: ListSourceNode,
  SEND_EMAIL: SendEmailNode,
  WAIT: WaitNode,
};

function toRfNode(n: FlowRecord["nodes"][number]): Node {
  return {
    id: n.id,
    type: n.type,
    position: { x: n.posX, y: n.posY },
    data: { config: n.config },
  };
}

function toRfEdge(e: FlowRecord["edges"][number]): Edge {
  return {
    id: e.id,
    source: e.sourceNodeId,
    target: e.targetNodeId,
  };
}

export default function FlowEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { activeOrgId } = useActiveOrg();
  const headers = activeOrgId ? { "x-active-organization-id": activeOrgId } : {};

  const [flow, setFlow] = useState<FlowRecord | null>(null);
  const [name, setName] = useState("");
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<FlowNodeData | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [panelWidth, setPanelWidth] = useState<number>(() => {
    try {
      const v = typeof window !== "undefined" ? localStorage.getItem("flowPanelWidth") : null;
      return v ? Number(v) : 420;
    } catch {
      return 420;
    }
  });
  const startXRef = useRef<number | null>(null);
  const startWidthRef = useRef<number | null>(null);

  const isDraft = flow?.status === "DRAFT";
  const isActive = flow?.status === "ACTIVE";
  const isPaused = flow?.status === "PAUSED";

  useEffect(() => {
    if (!id) return;
    void apiClient.flowContract
      .getFlow({ params: { id }, extraHeaders: activeOrgId ? headers : undefined })
      .then((r) => {
        if (r.status === 200) {
          setFlow(r.body);
          setName(r.body.name);
          setNodes(r.body.nodes.map(toRfNode));
          setEdges(r.body.edges.map(toRfEdge));
        } else {
          toast.error("Flow not found");
          void navigate("/flows");
        }
      });
  }, [id, activeOrgId]);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge(connection, eds)),
    [setEdges],
  );

  function addNode(type: "SEND_EMAIL" | "WAIT") {
    const newNode: Node = {
      id: uuidv4(),
      type,
      position: { x: 200, y: nodes.length * 150 + 100 },
      data: { config: {} },
    };
    setNodes((nds) => [...nds, newNode]);
  }

  function handleNodeClick(_: React.MouseEvent, node: Node) {
    setSelectedNode({
      id: node.id,
      type: node.type as FlowNodeData["type"],
      config: (node.data.config as Record<string, unknown>) ?? {},
    });
  }

  function handleConfigChange(nodeId: string, config: Record<string, unknown>) {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, config } } : n)),
    );
    setSelectedNode((s) => (s?.id === nodeId ? { ...s, config } : s));
  }

  function handleDeleteSelected() {
    if (!selectedNode) return;
    const node = nodes.find((n) => n.id === selectedNode.id);
    if (node?.type === "LIST_SOURCE") {
      toast.error("The contact list node cannot be deleted");
      return;
    }
    setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
    setEdges((eds) =>
      eds.filter(
        (e) => e.source !== selectedNode.id && e.target !== selectedNode.id,
      ),
    );
    setSelectedNode(null);
  }

  async function handleSave() {
    if (!id) return;
    setIsSaving(true);
    try {
      const r = await apiClient.flowContract.saveFlowGraph({
        params: { id },
        body: {
          name,
          nodes: nodes.map((n) => ({
            id: n.id,
            type: n.type as "LIST_SOURCE" | "SEND_EMAIL" | "WAIT",
            config: (n.data.config as Record<string, unknown>) ?? {},
            posX: n.position.x,
            posY: n.position.y,
          })),
          edges: edges.map((e) => ({
            id: e.id,
            sourceNodeId: e.source,
            targetNodeId: e.target,
          })),
        },
        extraHeaders: activeOrgId ? headers : undefined,
      });

      if (r.status === 200) {
        setFlow(r.body);
        toast.success("Flow saved");
      } else {
        toast.error(r.body.message);
      }
    } catch {
      toast.error("Failed to save flow");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleActivate() {
    if (!id) return;
    setIsActing(true);
    try {
      const r = await apiClient.flowContract.activateFlow({
        params: { id },
        body: undefined,
        extraHeaders: activeOrgId ? headers : undefined,
      });
      if (r.status === 200) {
        setFlow(r.body);
        toast.success("Flow activated — contacts are being enrolled");
      } else {
        toast.error(r.body.message);
      }
    } catch {
      toast.error("Failed to activate flow");
    } finally {
      setIsActing(false);
    }
  }

  async function handlePause() {
    if (!id) return;
    setIsActing(true);
    try {
      const r = await apiClient.flowContract.pauseFlow({
        params: { id },
        body: undefined,
        extraHeaders: activeOrgId ? headers : undefined,
      });
      if (r.status === 200) {
        setFlow(r.body);
        toast.success("Flow paused");
      } else {
        toast.error(r.body.message);
      }
    } catch {
      toast.error("Failed to pause flow");
    } finally {
      setIsActing(false);
    }
  }

  if (!flow) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Top bar */}
      <div className="flex items-center gap-3 border-b px-4 py-2 shrink-0">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => void navigate("/flows")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Input
          className="h-8 w-52 font-medium"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!isDraft}
        />
        <div className="ml-auto flex items-center gap-2">
          {selectedNode && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDeleteSelected}
              disabled={!isDraft}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Delete node
            </Button>
          )}
          {isDraft && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => addNode("SEND_EMAIL")}
              >
                <Mail className="h-4 w-4" />
                Add Email
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => addNode("WAIT")}
              >
                <Clock className="h-4 w-4" />
                Add Wait
              </Button>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => void handleSave()}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => void handleActivate()}
                disabled={isActing}
              >
                {isActing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
                Activate
              </Button>
            </>
          )}
          {isActive && (
            <Button
              size="sm"
              variant="outline"
              className="gap-2"
              onClick={() => void handlePause()}
              disabled={isActing}
            >
              {isActing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Pause className="h-4 w-4" />
              )}
              Pause
            </Button>
          )}
          {isPaused && (
            <Button
              size="sm"
              className="gap-2 bg-green-600 hover:bg-green-700"
              onClick={() => void handleActivate()}
              disabled={isActing}
            >
              {isActing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Resume
            </Button>
          )}
          <span className="text-xs text-muted-foreground border rounded px-2 py-1">
            {flow.status}
          </span>
        </div>
      </div>

      {/* Canvas + config panel */}
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={handleNodeClick}
            onPaneClick={() => setSelectedNode(null)}
            fitView
            nodesDraggable={isDraft}
            nodesConnectable={isDraft}
            elementsSelectable={isDraft}
          >
            <Background />
            <Controls />
            <MiniMap />
          </ReactFlow>
        </div>

        {selectedNode && (
          <>
            <div
              role="separator"
              onMouseDown={(e) => {
                e.preventDefault();
                startXRef.current = e.clientX;
                startWidthRef.current = panelWidth;

                const previousUserSelect = document.body.style.userSelect;
                const previousCursor = document.body.style.cursor;
                document.body.style.userSelect = "none";
                document.body.style.cursor = "col-resize";

                const onMouseMove = (ev: MouseEvent) => {
                  if (startXRef.current == null || startWidthRef.current == null) return;
                  const delta = ev.clientX - startXRef.current;
                  const newWidth = Math.max(320, Math.min(900, startWidthRef.current - delta));
                  setPanelWidth(newWidth);
                  try {
                    localStorage.setItem("flowPanelWidth", String(newWidth));
                  } catch {}
                };

                const onMouseUp = () => {
                  startXRef.current = null;
                  startWidthRef.current = null;
                  document.body.style.userSelect = previousUserSelect;
                  document.body.style.cursor = previousCursor;
                  window.removeEventListener("mousemove", onMouseMove);
                  window.removeEventListener("mouseup", onMouseUp);
                };

                window.addEventListener("mousemove", onMouseMove);
                window.addEventListener("mouseup", onMouseUp);
              }}
              className="w-2 cursor-col-resize shrink-0 hover:bg-border"
              style={{ touchAction: "none" }}
            />

            <div style={{ width: panelWidth }} className="shrink-0 border-l bg-background overflow-hidden">
              <NodeConfigPanel
                node={selectedNode}
                onConfigChange={handleConfigChange}
                onClose={() => setSelectedNode(null)}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
