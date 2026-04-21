import { apiClient } from "@/lib/api-client";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { contactListSchema } from "@repo/api-contract";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { useEffect, useState } from "react";
import type z from "zod";
import type { ListSourceConfig } from "../nodes/ListSourceNode";

type ContactList = z.infer<typeof contactListSchema>;

interface Props {
  config: ListSourceConfig;
  onChange: (config: ListSourceConfig) => void;
}

export function ListSourceConfigPanel({ config, onChange }: Props) {
  const { activeOrgId } = useActiveOrg();
  const [lists, setLists] = useState<ContactList[]>([]);

  useEffect(() => {
    void apiClient.contactListContract
      .listContactLists({
        extraHeaders: activeOrgId
          ? { "x-active-organization-id": activeOrgId }
          : undefined,
      })
      .then((r) => {
        if (r.status === 200) setLists(r.body.lists);
      });
  }, [activeOrgId]);

  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <label className="text-sm font-medium">Contact list</label>
        <Select
          value={config.contactListId ?? ""}
          onValueChange={(id) => {
            const list = lists.find((l) => l.id === id);
            onChange({ contactListId: id, contactListName: list?.name });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select a contact list" />
          </SelectTrigger>
          <SelectContent>
            {lists.map((l) => (
              <SelectItem key={l.id} value={l.id}>
                {l.name} ({l._count?.entries ?? 0} contacts)
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <p className="text-xs text-muted-foreground">
        Contacts in this list will be enrolled when the flow is activated. New
        contacts added later are also enrolled automatically.
      </p>
    </div>
  );
}
