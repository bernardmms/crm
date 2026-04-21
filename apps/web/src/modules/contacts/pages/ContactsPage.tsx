import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { ContactFormDialog } from "@/modules/contacts/components/ContactFormDialog";
import { ContactsTable } from "@/modules/contacts/components/ContactsTable";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { contactSchema } from "@repo/api-contract";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import { Input } from "@repo/ui/components/ui/input";
import { PlusCircle, Search } from "lucide-react";
import { useEffect, useState } from "react";
import type z from "zod";

type ContactRecord = z.infer<typeof contactSchema>;

export default function ContactsPage() {
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<ContactRecord | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  const fetchContacts = async (nextSearch = appliedSearch) => {
    try {
      setLoading(true);
      const response = await apiClient.contactContract.listContacts({
        query: {
          page: 1,
          limit: 50,
          search: nextSearch || undefined,
        },
        extraHeaders: activeOrgId
          ? { "x-active-organization-id": activeOrgId }
          : undefined,
      });

      if (response.status === 200) {
        setContacts(response.body.contacts);
        setTotal(response.body.total);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchContacts("");
    setAppliedSearch("");
    setSearch("");
  }, [activeOrgId]);

  const openCreateDialog = () => {
    setSelectedContact(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (contact: ContactRecord) => {
    setSelectedContact(contact);
    setIsDialogOpen(true);
  };

  const handleDelete = async (contact: ContactRecord) => {
    if (!window.confirm(`Delete contact "${formatContactName(contact)}"?`)) {
      return;
    }

    try {
      setIsDeleting(contact.id);
      const response = await apiClient.contactContract.deleteContact({
        params: { id: contact.id },
        body: undefined,
        extraHeaders: activeOrgId
          ? { "x-active-organization-id": activeOrgId }
          : undefined,
      });

      if (response.status === 200) {
        toast.success("Contact deleted");
        await fetchContacts();
        return;
      }

      toast.error("Failed to delete contact");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete contact");
    } finally {
      setIsDeleting(null);
    }
  };

  const applySearch = async () => {
    setAppliedSearch(search.trim());
    await fetchContacts(search.trim());
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contacts</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg
              ? `Shared contacts for ${activeOrg.name}`
              : "Your personal contact workspace"}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <PlusCircle className="mr-2 h-4 w-4" />
          New contact
        </Button>
      </div>

      <Card>
        <CardHeader className="gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <CardTitle>Contact directory</CardTitle>
            <CardDescription>{total} contacts in this workspace</CardDescription>
          </div>
          <div className="flex w-full flex-col gap-2 md:w-auto md:min-w-96 md:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void applySearch();
                  }
                }}
                placeholder="Search by name, email, company or phone"
                className="pl-9"
              />
            </div>
            <Button variant="outline" onClick={() => void applySearch()}>
              Search
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ContactsTable
            contacts={contacts}
            loading={loading}
            isDeleting={isDeleting}
            onEdit={openEditDialog}
            onDelete={(contact) => void handleDelete(contact)}
          />
        </CardContent>
      </Card>

      <ContactFormDialog
        open={isDialogOpen}
        activeOrgId={activeOrgId}
        selectedContact={selectedContact}
        onOpenChange={setIsDialogOpen}
        onSaved={() => fetchContacts()}
      />
    </div>
  );
}

function formatContactName(contact: ContactRecord) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}
