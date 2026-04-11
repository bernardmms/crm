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
import LeadsPage from "@/modules/prospecting/pages/LeadsPage";
import CompaniesPage from "@/modules/prospecting/pages/CompaniesPage";
import { NewOrganizationPage } from "@/modules/organizations/pages/NewOrganizationPage";
import { OrgSettingsPage } from "@/modules/organizations/pages/OrgSettingsPage";
import NotFoundPage from "@/modules/common/pages/NotFoundPage";
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
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
    <Toaster />
  </TooltipProvider>,
);
