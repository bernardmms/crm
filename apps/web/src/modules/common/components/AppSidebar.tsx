import useAuth from "@/modules/auth/hooks/useAuth";
import { OrgSwitcher } from "@/modules/organizations/components/OrgSwitcher";
import { NavMain } from "@repo/ui/components/nav-main";
import { NavUser } from "@repo/ui/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@repo/ui/components/ui/sidebar";
import { Bot, Contact, GitBranch, List, Mail, Search, Users } from "lucide-react";
import * as React from "react";
import { useMemo } from "react";

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
  const isAdmin = Array.isArray(user?.role)
    ? user.role.includes("admin")
    : user?.role === "admin";

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
      {
        title: "AI Agent",
        url: "/prospecting/agent",
        icon: Bot,
        items: [
          {
            title: "AI Agent",
            url: "/prospecting/agent",
          },
        ],
      },
    ],
    [],
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
