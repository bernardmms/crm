import CampaignCompaniesPanel from "@/modules/prospecting/components/CampaignCompaniesPanel";
import CampaignLeadsPanel from "@/modules/prospecting/components/CampaignLeadsPanel";
import { getApiErrorMessage } from "@/modules/prospecting/helpers";
import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import type { CampaignRecord } from "@/modules/prospecting/types";
import {
  Card,
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

type SearchTab = "companies" | "leads";

function parseSearchTab(value: string | null): SearchTab {
  return value === "leads" ? "leads" : "companies";
}

export default function ProspectingSearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);

  const activeTab = parseSearchTab(searchParams.get("tab"));
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

  function updateSearchParams(next: { tab?: SearchTab; campaignId?: string }) {
    const params = new URLSearchParams(searchParams);
    if (next.tab) params.set("tab", next.tab);
    if (next.campaignId) params.set("campaignId", next.campaignId);
    setSearchParams(params, { replace: true });
  }

  async function loadCampaigns() {
    try {
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
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-sm text-muted-foreground">
          Search companies and leads with campaign-specific filters
        </p>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div>
            <CardTitle>Campaign scope</CardTitle>
            <CardDescription>
              Choose a campaign before searching companies or leads
            </CardDescription>
          </div>
          <Select
            value={selectedCampaignId || undefined}
            onValueChange={(value) => updateSearchParams({ campaignId: value })}
          >
            <SelectTrigger className="max-w-xl">
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
          <div className="text-xs text-muted-foreground">
            {selectedCampaign
              ? `Current campaign: ${selectedCampaign.campaignName}`
              : "No campaign selected"}
          </div>
        </CardHeader>
      </Card>

      <Tabs
        value={activeTab}
        onValueChange={(value) => updateSearchParams({ tab: parseSearchTab(value) })}
      >
        <TabsList className="w-fit">
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="leads">Leads</TabsTrigger>
        </TabsList>

        <TabsContent value="companies">
          <CampaignCompaniesPanel campaignId={selectedCampaign?.id} />
        </TabsContent>

        <TabsContent value="leads">
          <CampaignLeadsPanel campaignId={selectedCampaign?.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
