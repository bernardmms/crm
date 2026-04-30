import { apiClient } from "@/lib/api-client";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { contactListSchema } from "@repo/api-contract";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@repo/ui/components/ui/tabs";
import { useEffect, useState } from "react";
import type z from "zod";
import type {
  AiAgentParams,
  ListSourceConfig,
} from "../nodes/ListSourceNode";

type ContactList = z.infer<typeof contactListSchema>;

interface Props {
  config: ListSourceConfig;
  onChange: (config: ListSourceConfig) => void;
}

const DEFAULT_AGENT_PARAMS: AiAgentParams = {
  industry: "",
  geo: "",
  produto: "",
  target_titles: [],
  company_size: "10-100 funcionários",
  max_leads: 50,
  min_score: 7,
  dry_run: true,
};

export function ListSourceConfigPanel({ config, onChange }: Props) {
  const { activeOrgId } = useActiveOrg();
  const [lists, setLists] = useState<ContactList[]>([]);

  const mode = (config as { mode?: string }).mode ?? "LIST";

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

  function handleModeChange(nextMode: string) {
    if (nextMode === "LIST") {
      const listConf = config as Extract<ListSourceConfig, { mode?: "LIST" }>;
      onChange({
        mode: "LIST",
        contactListId: listConf.contactListId,
        contactListName: listConf.contactListName,
      });
    } else {
      const aiConf = config as Extract<ListSourceConfig, { mode: "AI_AGENT" }>;
      onChange({
        mode: "AI_AGENT",
        agentParams: aiConf.agentParams ?? { ...DEFAULT_AGENT_PARAMS },
        aiAgentRunId: aiConf.aiAgentRunId,
        aiAgentRunStatus: aiConf.aiAgentRunStatus,
        contactListId: aiConf.contactListId,
        contactListName: aiConf.contactListName,
        runIndex: aiConf.runIndex,
        failureReason: aiConf.failureReason,
      });
    }
  }

  return (
    <Tabs value={mode} onValueChange={handleModeChange} className="space-y-3">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="LIST">Contact List</TabsTrigger>
        <TabsTrigger value="AI_AGENT">AI Agent</TabsTrigger>
      </TabsList>

      <TabsContent value="LIST" className="space-y-3">
        <ListModePanel
          config={config as Extract<ListSourceConfig, { mode?: "LIST" }>}
          lists={lists}
          onChange={(c) => onChange({ mode: "LIST", ...c })}
        />
      </TabsContent>

      <TabsContent value="AI_AGENT" className="space-y-3">
        <AiAgentModePanel
          config={config as Extract<ListSourceConfig, { mode: "AI_AGENT" }>}
          onChange={(next) => onChange({ mode: "AI_AGENT", ...next })}
        />
      </TabsContent>
    </Tabs>
  );
}

function ListModePanel({
  config,
  lists,
  onChange,
}: {
  config: Extract<ListSourceConfig, { mode?: "LIST" }>;
  lists: ContactList[];
  onChange: (c: { contactListId?: string; contactListName?: string }) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="space-y-1">
        <Label className="text-sm font-medium">Contact list</Label>
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

function AiAgentModePanel({
  config,
  onChange,
}: {
  config: Extract<ListSourceConfig, { mode: "AI_AGENT" }>;
  onChange: (
    next: Omit<Extract<ListSourceConfig, { mode: "AI_AGENT" }>, "mode">,
  ) => void;
}) {
  const params = config.agentParams ?? DEFAULT_AGENT_PARAMS;
  const [titlesRaw, setTitlesRaw] = useState(
    (params.target_titles ?? []).join(", "),
  );

  function setParam<K extends keyof AiAgentParams>(
    key: K,
    value: AiAgentParams[K],
  ) {
    const nextParams: AiAgentParams = { ...params, [key]: value };
    onChange({
      ...config,
      agentParams: nextParams,
    });
  }

  function handleTitlesChange(raw: string) {
    setTitlesRaw(raw);
    setParam(
      "target_titles",
      raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    );
  }

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className="text-[12px]">Industry *</Label>
        <Input
          className="h-8 text-[13px]"
          placeholder="e.g. energia solar"
          value={params.industry}
          onChange={(e) => setParam("industry", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Region *</Label>
        <Input
          className="h-8 text-[13px]"
          placeholder="e.g. São Paulo, SP"
          value={params.geo}
          onChange={(e) => setParam("geo", e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label className="text-[12px]">Product / Service *</Label>
        <Input
          className="h-8 text-[13px]"
          placeholder="What are you selling?"
          value={params.produto}
          onChange={(e) => setParam("produto", e.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-[12px]">Target titles (comma-separated)</Label>
        <Input
          className="h-8 text-[13px]"
          placeholder="CEO, Diretor, Sócio"
          value={titlesRaw}
          onChange={(e) => handleTitlesChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-[12px]">Company size</Label>
          <Input
            className="h-8 text-[13px]"
            placeholder="10-100"
            value={params.company_size ?? ""}
            onChange={(e) => setParam("company_size", e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Max leads</Label>
          <Input
            type="number"
            className="h-8 text-[13px]"
            min={1}
            max={200}
            value={params.max_leads ?? 50}
            onChange={(e) => setParam("max_leads", Number(e.target.value))}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[12px]">Min score</Label>
          <Input
            type="number"
            className="h-8 text-[13px]"
            min={0}
            max={10}
            value={params.min_score ?? 7}
            onChange={(e) => setParam("min_score", Number(e.target.value))}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="ai_dry_run"
          checked={params.dry_run ?? true}
          onCheckedChange={(v) => setParam("dry_run", Boolean(v))}
        />
        <Label htmlFor="ai_dry_run" className="text-[13px] cursor-pointer">
          Dry run (simulate outreach)
        </Label>
      </div>

      <p className="text-xs text-muted-foreground">
        When the flow is activated, an AI agent run will be launched with these
        parameters. A new contact list is auto-created and qualified leads are
        enrolled into the flow as soon as the run completes.
      </p>

      {config.aiAgentRunStatus && (
        <div className="rounded-md border bg-muted/40 p-2 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Run status</span>
            <span className="font-medium">{config.aiAgentRunStatus}</span>
          </div>
          {config.contactListName && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Auto list</span>
              <span className="font-medium truncate ml-2" title={config.contactListName}>
                {config.contactListName}
              </span>
            </div>
          )}
          {config.failureReason && (
            <p className="text-red-600">{config.failureReason}</p>
          )}
        </div>
      )}
    </div>
  );
}
