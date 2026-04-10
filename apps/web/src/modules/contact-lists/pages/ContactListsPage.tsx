import { apiClient } from "@/lib/api-client";
import { mapTsRestErrorsToFormErrors } from "@/lib/form-utils";
import { toast } from "@/lib/toast";
import { FormError } from "@/modules/common/components/FormError";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactListDetailSchema,
  contactListSchema,
  contactSchema,
  createContactListRequestSchema,
  type updateContactListRequestSchema,
} from "@repo/api-contract";
import { Button } from "@repo/ui/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/ui/table";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { ListPlus, Pencil, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type z from "zod";

type ContactListRecord = z.infer<typeof contactListSchema>;
type ContactListDetail = z.infer<typeof contactListDetailSchema>;
type ContactRecord = z.infer<typeof contactSchema>;
type ContactListFormData = z.infer<typeof createContactListRequestSchema>;
type ContactListUpdateData = z.infer<typeof updateContactListRequestSchema>;

const emptyValues: ContactListFormData = {
  name: "",
  description: "",
};

export default function ContactListsPage() {
  const { activeOrgId, activeOrg } = useActiveOrg();
  const [lists, setLists] = useState<ContactListRecord[]>([]);
  const [selectedListId, setSelectedListId] = useState<string | null>(null);
  const [selectedList, setSelectedList] = useState<ContactListDetail | null>(
    null,
  );
  const [contacts, setContacts] = useState<ContactRecord[]>([]);
  const [selectedContactId, setSelectedContactId] = useState("");
  const [loadingLists, setLoadingLists] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingList, setEditingList] = useState<ContactListRecord | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddingContact, setIsAddingContact] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<ContactListFormData>({
    resolver: zodResolver(createContactListRequestSchema),
    defaultValues: emptyValues,
  });

  const availableContacts = useMemo(() => {
    const selectedContactIds = new Set(
      selectedList?.entries.map((entry) => entry.contact.id) ?? [],
    );
    return contacts.filter((contact) => !selectedContactIds.has(contact.id));
  }, [contacts, selectedList]);

  const listHeaders = activeOrgId
    ? { "x-active-organization-id": activeOrgId }
    : {};

  const fetchLists = async () => {
    try {
      setLoadingLists(true);
      const response = await apiClient.contactListContract.listContactLists({
        extraHeaders: activeOrgId ? listHeaders : undefined,
      });

      if (response.status === 200) {
        setLists(response.body.lists);

        const nextSelectedId =
          response.body.lists.find((list) => list.id === selectedListId)?.id ??
          response.body.lists[0]?.id ??
          null;

        setSelectedListId(nextSelectedId);
        if (nextSelectedId) {
          await fetchListDetails(nextSelectedId);
        } else {
          setSelectedList(null);
        }
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load lists");
    } finally {
      setLoadingLists(false);
    }
  };

  const fetchListDetails = async (listId: string) => {
    try {
      setLoadingDetails(true);
      const response = await apiClient.contactListContract.getContactList({
        params: { id: listId },
        extraHeaders: activeOrgId ? listHeaders : undefined,
      });

      if (response.status === 200) {
        setSelectedList(response.body);
      } else {
        setSelectedList(null);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load list details");
    } finally {
      setLoadingDetails(false);
    }
  };

  const fetchContacts = async () => {
    try {
      const response = await apiClient.contactContract.listContacts({
        query: { page: 1, limit: 200 },
        extraHeaders: activeOrgId ? listHeaders : undefined,
      });

      if (response.status === 200) {
        setContacts(response.body.contacts);
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load contacts for list assignment");
    }
  };

  useEffect(() => {
    setSelectedListId(null);
    setSelectedList(null);
    setSelectedContactId("");
    void Promise.all([fetchLists(), fetchContacts()]);
  }, [activeOrgId]);

  const openCreateDialog = () => {
    setEditingList(null);
    reset(emptyValues);
    setIsDialogOpen(true);
  };

  const openEditDialog = (list: ContactListRecord) => {
    setEditingList(list);
    reset({
      name: list.name,
      description: list.description ?? "",
    });
    setIsDialogOpen(true);
  };

  const onSubmit = async (data: ContactListFormData) => {
    try {
      setIsSaving(true);

      if (editingList) {
        const response = await apiClient.contactListContract.updateContactList({
          params: { id: editingList.id },
          body: buildUpdateListPayload(data),
          extraHeaders: activeOrgId ? listHeaders : undefined,
        });

        if (response.status === 200) {
          toast.success("List updated");
          setIsDialogOpen(false);
          await fetchLists();
          return;
        }

        if (response.status === 400) {
          mapTsRestErrorsToFormErrors(response.body, setError);
          return;
        }

        toast.error("Failed to update list");
        return;
      }

      const response = await apiClient.contactListContract.createContactList({
        body: buildCreateListPayload(data),
        extraHeaders: activeOrgId ? listHeaders : undefined,
      });

      if (response.status === 201) {
        toast.success("List created");
        setIsDialogOpen(false);
        await fetchLists();
        setSelectedListId(response.body.id);
        await fetchListDetails(response.body.id);
        return;
      }

      if (response.status === 400) {
        mapTsRestErrorsToFormErrors(response.body, setError);
        return;
      }

      toast.error("Failed to save list");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save list");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteList = async (list: ContactListRecord) => {
    if (!window.confirm(`Delete list "${list.name}"?`)) {
      return;
    }

    try {
      const response = await apiClient.contactListContract.deleteContactList({
        params: { id: list.id },
        body: undefined,
        extraHeaders: activeOrgId ? listHeaders : undefined,
      });

      if (response.status === 200) {
        toast.success("List deleted");
        await fetchLists();
        return;
      }

      toast.error("Failed to delete list");
    } catch (error) {
      console.error(error);
      toast.error("Failed to delete list");
    }
  };

  const handleAddContact = async () => {
    if (!selectedList || !selectedContactId) {
      toast.error("Select a contact first");
      return;
    }

    try {
      setIsAddingContact(true);
      const response = await apiClient.contactListContract.addContactToList({
        params: { id: selectedList.id },
        body: { contactId: selectedContactId },
        extraHeaders: activeOrgId ? listHeaders : undefined,
      });

      if (response.status === 201) {
        toast.success("Contact added to list");
        setSelectedContactId("");
        await fetchListDetails(selectedList.id);
        return;
      }

      toast.error("Failed to add contact");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add contact");
    } finally {
      setIsAddingContact(false);
    }
  };

  const handleRemoveContact = async (contactId: string) => {
    if (!selectedList) {
      return;
    }

    try {
      const response =
        await apiClient.contactListContract.removeContactFromList({
          params: { id: selectedList.id, contactId },
          body: undefined,
          extraHeaders: activeOrgId ? listHeaders : undefined,
        });

      if (response.status === 200) {
        toast.success("Contact removed from list");
        await fetchListDetails(selectedList.id);
        return;
      }

      toast.error("Failed to remove contact");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove contact");
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lists</h1>
          <p className="text-sm text-muted-foreground">
            {activeOrg
              ? `Shared segments for ${activeOrg.name}`
              : "Segments for your personal workspace"}
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <ListPlus className="mr-2 h-4 w-4" />
          New list
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>All lists</CardTitle>
            <CardDescription>
              Create reusable groups of contacts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingLists ? (
              <p className="text-sm text-muted-foreground">Loading lists...</p>
            ) : lists.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No lists yet. Create your first one.
              </p>
            ) : (
              lists.map((list) => (
                <div
                  key={list.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => {
                    setSelectedListId(list.id);
                    void fetchListDetails(list.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedListId(list.id);
                      void fetchListDetails(list.id);
                    }
                  }}
                  className={`w-full cursor-pointer rounded-lg border p-4 text-left transition ${selectedListId === list.id
                      ? "border-primary bg-primary/5"
                      : "hover:border-primary/40"
                    }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{list.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {list._count?.entries ?? 0} contacts
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditDialog(list);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(event) => {
                          event.stopPropagation();
                          void handleDeleteList(list);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {list.description ? (
                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                      {list.description}
                    </p>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="gap-4">
            <div>
              <CardTitle>
                {selectedList ? selectedList.name : "Select a list"}
              </CardTitle>
              <CardDescription>
                {selectedList?.description || "Manage list members and contents"}
              </CardDescription>
            </div>
            {selectedList ? (
              <div className="flex flex-col gap-2 md:flex-row">
                <Select
                  value={selectedContactId}
                  onValueChange={setSelectedContactId}
                >
                  <SelectTrigger className="w-full md:min-w-80">
                    <SelectValue placeholder="Choose a contact to add" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableContacts.map((contact) => (
                      <SelectItem key={contact.id} value={contact.id}>
                        {formatContactName(contact)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => void handleAddContact()}
                  disabled={isAddingContact || availableContacts.length === 0}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add contact
                </Button>
              </div>
            ) : null}
          </CardHeader>
          <CardContent>
            {!selectedListId ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Choose a list on the left to see its contacts.
              </p>
            ) : loadingDetails ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                Loading list details...
              </p>
            ) : !selectedList ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                The selected list could not be loaded.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Added</TableHead>
                    <TableHead className="w-[100px] text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {selectedList.entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                        No contacts in this list yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    selectedList.entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="font-medium">
                          {formatContactName(entry.contact)}
                        </TableCell>
                        <TableCell>{entry.contact.company ?? "-"}</TableCell>
                        <TableCell>{entry.contact.email ?? "-"}</TableCell>
                        <TableCell>
                          {new Date(entry.addedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              void handleRemoveContact(entry.contact.id)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingList ? "Edit list" : "Create list"}
            </DialogTitle>
            <DialogDescription>
              Use lists to segment contacts by campaign, team or status.
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                List name
              </label>
              <Input id="name" {...register("name")} />
              <FormError message={errors.name?.message} />
            </div>
            <div className="grid gap-2">
              <label htmlFor="description" className="text-sm font-medium">
                Description
              </label>
              <Textarea id="description" rows={4} {...register("description")} />
              <FormError message={errors.description?.message} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save list"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function buildCreateListPayload(data: ContactListFormData): ContactListFormData {
  return {
    name: data.name.trim(),
    description: trimOptional(data.description),
  };
}

function buildUpdateListPayload(
  data: ContactListFormData,
): ContactListUpdateData {
  const payload: ContactListUpdateData = {};

  if (data.name.trim()) payload.name = data.name.trim();
  if (trimOptional(data.description)) {
    payload.description = trimOptional(data.description);
  }

  return payload;
}

function formatContactName(contact: ContactRecord) {
  return [contact.firstName, contact.lastName].filter(Boolean).join(" ");
}

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}
