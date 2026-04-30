import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import { Toaster } from "sonner";
import { TooltipProvider } from "@repo/ui/components/ui/tooltip";
import { AuthLayout } from "@/modules/auth/layouts/AuthLayout";
import LogInPage from "@/modules/auth/pages/LogInPage";
import { AppLayout } from "@/modules/common/layouts/AppLayout";
import HomePage from "@/modules/common/pages/HomePage";
import ContactsPage from "@/modules/contacts/pages/ContactsPage";
import ContactListsPage from "@/modules/contact-lists/pages/ContactListsPage";
import UsersPage from "@/modules/admin/users/UsersPage";
import ProspectingSearchPage from "@/modules/prospecting/pages/ProspectingSearchPage";
import { NewOrganizationPage } from "@/modules/organizations/pages/NewOrganizationPage";
import { OrgSettingsPage } from "@/modules/organizations/pages/OrgSettingsPage";
import EmailCampaignsPage from "@/modules/email-campaigns/pages/EmailCampaignsPage";
import FlowsPage from "@/modules/flows/pages/FlowsPage";
import FlowEditorPage from "@/modules/flows/pages/FlowEditorPage";
import AgentPage from "@/modules/prospecting/pages/AgentPage";
import UnsubscribePage from "@/modules/unsubscribe/pages/UnsubscribePage";
import NotFoundPage from "@/modules/common/pages/NotFoundPage";
import { Navigate } from "react-router";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <TooltipProvider>
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/lists" element={<ContactListsPage />} />
            <Route path="/email" element={<EmailCampaignsPage />} />
            <Route path="/flows" element={<FlowsPage />} />
            <Route path="/flows/:id/edit" element={<FlowEditorPage />} />
            <Route path="/prospecting/search" element={<ProspectingSearchPage />} />
            <Route path="/prospecting/agent" element={<AgentPage />} />
            <Route
              path="/leads"
              element={<Navigate replace to="/prospecting/search?tab=leads" />}
            />
            <Route
              path="/companies"
              element={<Navigate replace to="/prospecting/search?tab=companies" />}
            />
            <Route path="/admin/users" element={<UsersPage />} />
            <Route
              path="/organizations/new"
              element={<NewOrganizationPage />}
            />
            <Route
              path="/organizations/:slug/settings"
              element={<OrgSettingsPage />}
            />
          </Route>
        </Route>
        <Route path="/login" element={<LogInPage />} />
        <Route
          path="/unsubscribe/:contactId/:token"
          element={<UnsubscribePage />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    <Toaster />
  </TooltipProvider>,
);
