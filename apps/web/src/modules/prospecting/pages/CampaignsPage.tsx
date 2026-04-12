import CampaignCompaniesPanel from "@/modules/prospecting/components/CampaignCompaniesPanel";
import CampaignLeadsPanel from "@/modules/prospecting/components/CampaignLeadsPanel";
import { formatCampaignStatus, getApiErrorMessage } from "@/modules/prospecting/helpers";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { CampaignRecord } from "@/modules/prospecting/types";
import { Badge } from "@repo/ui/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@repo/ui/components/ui/tabs";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";

type CampaignTab = "companies" | "leads";

function parseCampaignTab(value: string | null): CampaignTab {
  return value === "leads" ? "leads" : "companies";
}

export default function CampaignsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(true);

  const activeTab = parseCampaignTab(searchParams.get("tab"));
  const selectedCampaignId = searchParams.get("campaignId") ?? "";

  useEffect(() => {
    void loadCampaigns();
  }, []);

  useEffect(() => {
    if (campaigns.length === 0) return;

    const hasSelectedCampaign = campaigns.some(
      (campaign) => String(campaign.id) === selectedCampaignId,
    );
    const normalizedCampaignId = hasSelectedCampaign
      ? selectedCampaignId
      : String(campaigns[0].id);

    const currentTab = searchParams.get("tab");
    const currentCampaignId = searchParams.get("campaignId");

    if (currentTab === activeTab && currentCampaignId === normalizedCampaignId) {
      return;
    }

    const params = new URLSearchParams(searchParams);
    params.set("tab", activeTab);
    params.set("campaignId", normalizedCampaignId);
    setSearchParams(params, { replace: true });
  }, [campaigns, selectedCampaignId, activeTab, searchParams, setSearchParams]);

  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => String(campaign.id) === selectedCampaignId),
    [campaigns, selectedCampaignId],
  );

  const campaignId = selectedCampaign?.id;

  function updateSearchParams(next: { tab?: CampaignTab; campaignId?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.tab) params.set("tab", next.tab);
    if (next.campaignId) params.set("campaignId", next.campaignId);
    setSearchParams(params, { replace: true });
  }

  async function loadCampaigns() {
    try {
      setLoadingCampaigns(true);
      const response = await apiClient.campaignDataContract.listCampaigns({
        query: { page: 1, limit: 200 },
      });

      if (response.status !== 200) {
        toast.error(getApiErrorMessage(response.body, "Failed to load campaigns"));
        return;
      }

      const body = response.body as { campaigns: CampaignRecord[] };
      setCampaigns(body.campaigns);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load campaigns");
    } finally {
      setLoadingCampaigns(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Campaigns</h1>
        <p className="text-sm text-muted-foreground">
          Campaign details and data split by companies and leads
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Campaign details</CardTitle>
            <CardDescription>Select a campaign to inspect its results</CardDescription>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <Select
              value={selectedCampaignId || undefined}
              onValueChange={(value) => updateSearchParams({ campaignId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Campaign" />
              </SelectTrigger>
              <SelectContent>
                {campaigns.map((campaign) => (
                  <SelectItem key={campaign.id} value={String(campaign.id)}>
                    {campaign.campaignName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="rounded-md border p-3 text-sm">
              {selectedCampaign ? (
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{selectedCampaign.campaignName}</span>
                    <Badge variant="outline">
                      {formatCampaignStatus(selectedCampaign.status)}
                    </Badge>
                  </div>
                  <div className="text-muted-foreground">
                    Database: {selectedCampaign.databaseName ?? selectedCampaign.databaseFk}
                  </div>
                  <div className="text-muted-foreground">
                    Created: {new Date(selectedCampaign.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ) : (
                <span className="text-muted-foreground">
                  {loadingCampaigns ? "Loading campaigns..." : "No campaign available"}
                </span>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => updateSearchParams({ tab: parseCampaignTab(value) })}
      >
        <TabsList className="w-fit">
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <CampaignCompaniesPanel campaignId={campaignId} />
        </TabsContent>

        <TabsContent value="leads">
          <CampaignLeadsPanel campaignId={campaignId} />
        </TabsContent>
      </Tabs>

      {!loadingCampaigns && campaigns.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            No campaigns available.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
