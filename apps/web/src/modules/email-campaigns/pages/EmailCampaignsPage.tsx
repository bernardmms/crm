import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import {
  emailCampaignWithStatsSchema,
  emailCampaignDetailSchema,
} from "@repo/api-contract";
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
import { Mail, Pencil, Plus, Send, Trash2, Clock, Eye } from "lucide-react";
import { useEffect, useState } from "react";
import type z from "zod";
import { CampaignFormDialog } from "../components/CampaignFormDialog";
import { CampaignDetailDialog } from "../components/CampaignDetailDialog";

type EmailCampaignRecord = z.infer<typeof emailCampaignWithStatsSchema>;
type EmailCampaignDetail = z.infer<typeof emailCampaignDetailSchema>;

function getStatusBadge(status: string) {
  switch (status) {
    case "DRAFT":
      return <Badge variant="secondary">Draft</Badge>;
    case "SCHEDULED":
      return <Badge variant="outline">Scheduled</Badge>;
    case "SENDING":
      return (
        <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Sending
        </Badge>
      );
    case "SENT":
      return (
        <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          Sent
        </Badge>
      );
    case "FAILED":
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function EmailCampaignsPage() {
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [campaigns, setCampaigns] = useState<EmailCampaignRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] =
    useState<EmailCampaignRecord | null>(null);
  const [detailCampaign, setDetailCampaign] =
    useState<EmailCampaignDetail | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const headers = activeOrgId
    ? { "x-active-organization-id": activeOrgId }
    : {};

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const response =
        await apiClient.emailCampaignContract.listEmailCampaigns({
          extraHeaders: activeOrgId ? headers : undefined,
        });

      if (response.status === 200) {
        setCampaigns(response.body.campaigns);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load email campaigns");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCampaigns();
  }, [activeOrgId]);

  const handleDelete = async (campaign: EmailCampaignRecord) => {
    if (!window.confirm(`Delete campaign "${campaign.name}"?`)) return;

    try {
      const response =
        await apiClient.emailCampaignContract.deleteEmailCampaign({
          params: { id: campaign.id },
          body: undefined,
          extraHeaders: activeOrgId ? headers : undefined,
        });

      if (response.status === 200) {
        toast.success("Campaign deleted");
        await fetchCampaigns();
      } else {
        toast.error(
          response.status === 404 ? response.body.message : "Failed to delete",
        );
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete campaign");
    }
  };

  const handleSend = async (campaign: EmailCampaignRecord) => {
    if (
      !window.confirm(
        `Send campaign "${campaign.name}" to all contacts in "${campaign.contactList.name}" now?`,
      )
    )
      return;

    try {
      const response =
        await apiClient.emailCampaignContract.sendEmailCampaign({
          params: { id: campaign.id },
          body: undefined,
          extraHeaders: activeOrgId ? headers : undefined,
        });

      if (response.status === 200) {
        toast.success(response.body.message);
        await fetchCampaigns();
      } else {
        toast.error(response.body.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to send campaign");
    }
  };

  const handleViewDetail = async (campaign: EmailCampaignRecord) => {
    try {
      const response =
        await apiClient.emailCampaignContract.getEmailCampaign({
          params: { id: campaign.id },
          extraHeaders: activeOrgId ? headers : undefined,
        });

      if (response.status === 200) {
        setDetailCampaign(response.body);
        setIsDetailOpen(true);
      } else {
        toast.error("Failed to load campaign details");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load campaign details");
    }
  };

  const openEdit = (campaign: EmailCampaignRecord) => {
    setEditingCampaign(campaign);
    setIsFormOpen(true);
  };

  const openCreate = () => {
    setEditingCampaign(null);
    setIsFormOpen(true);
  };

  const handleFormSaved = async () => {
    setIsFormOpen(false);
    setEditingCampaign(null);
    await fetchCampaigns();
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Email Campaigns</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg
              ? `Email campaigns for ${activeOrg.name}`
              : "Email campaigns for your personal workspace"}
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Campaign
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Campaigns</CardTitle>
          <CardDescription>
            Create, schedule, and send email campaigns to your contact lists
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              Loading campaigns...
            </p>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-10">
              <Mail className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                No email campaigns yet. Create your first one.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact List</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Recipients</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell className="font-medium">
                      {campaign.name}
                    </TableCell>
                    <TableCell>{campaign.contactList.name}</TableCell>
                    <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                    <TableCell>
                      {campaign.stats ? (
                        <span className="text-sm">
                          {campaign.stats.sent}/{campaign.stats.total} sent
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          {campaign._count?.recipients ?? 0}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {campaign.sentAt
                        ? new Date(campaign.sentAt).toLocaleDateString()
                        : campaign.scheduledAt
                          ? new Date(campaign.scheduledAt).toLocaleString()
                          : new Date(campaign.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          title="View details"
                          onClick={() => void handleViewDetail(campaign)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {campaign.status === "DRAFT" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Edit"
                              onClick={() => openEdit(campaign)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Send now"
                              onClick={() => void handleSend(campaign)}
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              title="Delete"
                              onClick={() => void handleDelete(campaign)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                        {campaign.status === "SCHEDULED" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Scheduled"
                            disabled
                          >
                            <Clock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <CampaignFormDialog
        open={isFormOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEditingCampaign(null);
          }
          setIsFormOpen(open);
        }}
        campaign={editingCampaign}
        onSaved={handleFormSaved}
      />

      <CampaignDetailDialog
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        campaign={detailCampaign}
      />
    </div>
  );
}
