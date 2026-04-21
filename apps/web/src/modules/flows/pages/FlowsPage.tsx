import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { CreateFlowDialog } from "@/modules/flows/components/CreateFlowDialog";
import { flowWithNodesSchema } from "@repo/api-contract";
import { Badge } from "@repo/ui/components/ui/badge";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { GitBranch, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import type z from "zod";

type FlowRecord = z.infer<typeof flowWithNodesSchema>;

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "ACTIVE":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Active
        </Badge>
      );
    case "PAUSED":
      return <Badge variant="outline">Paused</Badge>;
    case "ARCHIVED":
      return <Badge variant="secondary">Archived</Badge>;
    default:
      return <Badge variant="secondary">Draft</Badge>;
  }
}

export default function FlowsPage() {
  const navigate = useNavigate();
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [flows, setFlows] = useState<FlowRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const headers = activeOrgId ? { "x-active-organization-id": activeOrgId } : {};

  const fetchFlows = async () => {
    try {
      setLoading(true);
      const r = await apiClient.flowContract.listFlows({
        extraHeaders: activeOrgId ? headers : undefined,
      });
      if (r.status === 200) setFlows(r.body.flows);
    } catch {
      toast.error("Failed to load flows");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchFlows();
  }, [activeOrgId]);

  async function handleDelete(flow: FlowRecord) {
    if (!window.confirm(`Delete flow "${flow.name}"?`)) return;
    try {
      const r = await apiClient.flowContract.deleteFlow({
        params: { id: flow.id },
        body: undefined,
        extraHeaders: activeOrgId ? headers : undefined,
      });
      if (r.status === 200) {
        toast.success("Flow deleted");
        await fetchFlows();
      } else {
        toast.error("Failed to delete flow");
      }
    } catch {
      toast.error("Failed to delete flow");
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <CreateFlowDialog open={createOpen} onOpenChange={setCreateOpen} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Flows</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg
              ? `Contact automation flows for ${activeOrg.name}`
              : "Contact automation flows for your personal workspace"}
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Flow
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Flows</CardTitle>
          <CardDescription>
            Build multi-step automated sequences for your contacts
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading flows…
            </p>
          ) : flows.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <GitBranch className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No flows yet. Create your first automation.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Steps</TableHead>
                  <TableHead>Enrollments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {flows.map((flow) => (
                  <TableRow key={flow.id}>
                    <TableCell className="font-medium">{flow.name}</TableCell>
                    <TableCell>
                      <StatusBadge status={flow.status} />
                    </TableCell>
                    <TableCell>{flow.nodes.length}</TableCell>
                    <TableCell>{flow._count?.enrollments ?? 0}</TableCell>
                    <TableCell>
                      {new Date(flow.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Edit"
                          onClick={() => void navigate(`/flows/${flow.id}/edit`)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Delete"
                          onClick={() => void handleDelete(flow)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
