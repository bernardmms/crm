import { ChevronsUpDown, Plus, Building2, User, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@repo/ui/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@repo/ui/components/ui/sidebar";
import { useActiveOrg } from "../hooks/useActiveOrg";
import { useNavigate } from "react-router";

export function OrgSwitcher() {
  const { activeOrg, orgs, switchOrg } = useActiveOrg();
  const { isMobile } = useSidebar();
  const navigate = useNavigate();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex aspect-square size-8 items-center justify-center rounded-lg">
                {activeOrg ? (
                  <Building2 className="size-4" />
                ) : (
                  <User className="size-4" />
                )}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {activeOrg?.name ?? "Personal Workspace"}
                </span>
                <span className="truncate text-xs">
                  {activeOrg ? "Organization" : "Personal"}
                </span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="text-muted-foreground text-xs">
              Workspaces
            </DropdownMenuLabel>

            <DropdownMenuItem onClick={() => switchOrg(null)}>
              <User className="mr-2 h-4 w-4" />
              Personal Workspace
            </DropdownMenuItem>

            {orgs.length > 0 && <DropdownMenuSeparator />}

            {orgs.map((org) => (
              <DropdownMenuItem
                key={org.id}
                onClick={() => switchOrg(org.id)}
              >
                <Building2 className="mr-2 h-4 w-4" />
                {org.name}
              </DropdownMenuItem>
            ))}

            <DropdownMenuSeparator />

            {activeOrg && (
              <DropdownMenuItem
                onClick={() =>
                  navigate(
                    `/organizations/${activeOrg.slug ?? activeOrg.id}/settings`
                  )
                }
              >
                <Settings className="mr-2 h-4 w-4" />
                Organization settings
              </DropdownMenuItem>
            )}

            <DropdownMenuItem onClick={() => navigate("/organizations/new")}>
              <Plus className="mr-2 h-4 w-4" />
              Create organization
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
