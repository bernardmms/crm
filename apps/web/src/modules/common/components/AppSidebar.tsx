import useAuth from "@/modules/auth/hooks/useAuth";
import { formatCampaignStatus } from "@/modules/prospecting/helpers";
import { OrgSwitcher } from "@/modules/organizations/components/OrgSwitcher";
import { apiClient } from "@/lib/api-client";
import type { CampaignRecord } from "@/modules/prospecting/types";
import { NavMain } from "@repo/ui/components/nav-main";
import { NavUser } from "@repo/ui/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@repo/ui/components/ui/sidebar";
import { Contact, GitBranch, List, Mail, Search, Target, Users } from "lucide-react";
import * as React from "react";
import { useEffect, useMemo, useState } from "react";

const navAdmin = [
  {
    title: "Admin",
    url: "/admin/users",
    icon: Users,
    items: [
      {
        title: "Users",
        url: "/admin/users",
      },
    ],
  },
];

export default function AppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth();
  const [campaigns, setCampaigns] = useState<CampaignRecord[]>([]);
  const isAdmin = Array.isArray(user?.role)
    ? user.role.includes("admin")
    : user?.role === "admin";

  useEffect(() => {
    void loadSidebarCampaigns();
  }, []);

  async function loadSidebarCampaigns() {
    try {
      const response = await apiClient.campaignDataContract.listCampaigns({
        query: { page: 1, limit: 30 },
      });

      if (response.status === 200) {
        setCampaigns(response.body.campaigns);
      }
    } catch (error) {
      console.error(error);
    }
  }

  const navUser = useMemo(
    () => [
      {
        title: "Contacts",
        url: "/contacts",
        icon: Contact,
        items: [
          {
            title: "All Contacts",
            url: "/contacts",
          },
        ],
      },
      {
        title: "Lists",
        url: "/lists",
        icon: List,
        items: [
          {
            title: "All Lists",
            url: "/lists",
          },
        ],
      },
      {
        title: "Email",
        url: "/email",
        icon: Mail,
        items: [
          {
            title: "All Campaigns",
            url: "/email",
          },
        ],
      },
      {
        title: "Flows",
        url: "/flows",
        icon: GitBranch,
        items: [
          {
            title: "All Flows",
            url: "/flows",
          },
        ],
      },
      {
        title: "Campaigns",
        url: "/prospecting/campaigns",
        icon: Target,
        items: [
          ...(campaigns.length > 0
            ? campaigns.map((campaign) => ({
                title: formatCampaignSidebarTitle(campaign),
                url: `/prospecting/campaigns?campaignId=${campaign.id}&tab=companies`,
              }))
            : [
                {
                  title: "View campaigns",
                  url: "/prospecting/campaigns",
                },
              ]),
        ],
      },
      {
        title: "Search",
        url: "/prospecting/search",
        icon: Search,
        items: [
          {
            title: "Companies",
            url: "/prospecting/search?tab=companies",
          },
          {
            title: "Leads",
            url: "/prospecting/search?tab=leads",
          },
        ],
      },
    ],
    [campaigns],
  );

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <div className="flex flex-row mt-2 group-data-[collapsible=icon]:hidden">
          <div className="flex items-center">
            <span className="font-semibold text-lg truncate text-primary">
              We
            </span>
            <span className="font-semibold text-lg truncate">CRM</span>
          </div>
        </div>
        <OrgSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navUser} />
        {isAdmin && <NavMain items={navAdmin} />}
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            avatar: user?.image || "",
            email: user?.email || "",
            name: user?.name || "",
          }}
          onLogout={() => void logout()}
        />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}

function formatCampaignSidebarTitle(campaign: CampaignRecord) {
  const campaignName = campaign.campaignName.trim();
  const truncatedName =
    campaignName.length > 22 ? `${campaignName.slice(0, 22)}...` : campaignName;
  const status = formatCampaignStatus(campaign.status);
  return `${truncatedName} (${status})`;
}
