import { prospectingApi } from "@/lib/prospecting-api";
import type {
  CompanyItem,
  LeadItem,
  OutreachStatus,
  ProspectingRunStatus,
  RunCreatePayload,
  RunSummary,
} from "@/lib/prospecting-api";
import { toast } from "@/lib/toast";
import { Button } from "@repo/ui/components/ui/button";
import { Checkbox } from "@repo/ui/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/ui/tooltip";
import { cn } from "@repo/ui/lib/utils";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  ExternalLink,
  Linkedin,
  Loader2,
  Play,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ─── Pipeline config ──────────────────────────────────────────────────────────

const PIPELINE_NODES = [
  { id: "input_validator", label: "Validate input" },
  { id: "lead_scout_web", label: "Scout leads" },
  { id: "deduplicator", label: "Deduplicate" },
  { id: "enricher_scraper", label: "Scrape websites" },
  { id: "enricher_social_phone", label: "Social & phone" },
  { id: "enricher_email", label: "Find emails" },
  { id: "enricher_whois", label: "WHOIS lookup" },
  { id: "merge_enrichment", label: "Merge data" },
  { id: "enricher_contact", label: "Enrich contacts" },
  { id: "qualifier", label: "BANT qualify" },
  { id: "email_generator", label: "Generate emails" },
  { id: "outreach_sender", label: "Send outreach" },
  { id: "crm_writer", label: "Write to CRM" },
  { id: "hubspot_sync", label: "Sync HubSpot" },
  { id: "reporter", label: "Generate report" },
] as const;

type NodeId = (typeof PIPELINE_NODES)[number]["id"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusDotClass(status: ProspectingRunStatus) {
  return {
    pending: "bg-amber-400",
    running: "bg-blue-500 animate-pulse",
    completed: "bg-emerald-500",
    failed: "bg-red-500",
    cancelled: "bg-muted-foreground",
  }[status];
}

function scorePillClass(score: number) {
  if (score >= 8) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60";
  if (score >= 6) return "bg-amber-50 text-amber-700 dark:bg-amber-950/60";
  return "bg-red-50 text-red-700 dark:bg-red-950/60";
}

function emailDotClass(confidence: string) {
  return {
    verified: "bg-emerald-500",
    guessed: "bg-amber-400",
    scraped: "bg-violet-400",
  }[confidence] ?? "bg-muted-foreground";
}

function icpToPayload(icp: Record<string, unknown>): RunCreatePayload {
  return {
    industry: String(icp.industry ?? ""),
    geo: String(icp.geo ?? ""),
    produto: String(icp.produto ?? ""),
    target_titles: Array.isArray(icp.target_titles)
      ? (icp.target_titles as string[])
      : [],
    company_size: icp.company_size != null ? String(icp.company_size) : undefined,
    max_leads: typeof icp.max_leads === "number" ? icp.max_leads : undefined,
    min_score: typeof icp.min_score === "number" ? icp.min_score : undefined,
    dry_run: typeof icp.dry_run === "boolean" ? icp.dry_run : true,
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function icpLabel(run: RunSummary) {
  const icp = run.icp as Record<string, string>;
  return `${icp.industry ?? "?"} · ${icp.geo ?? "?"}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RunListItem({
  run,
  active,
  onClick,
}: {
  run: RunSummary;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-3 py-2.5 border-b hover:bg-muted/20 transition-colors",
        active && "bg-muted/30",
      )}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDotClass(run.status))}
        />
        <span className="text-[12px] text-muted-foreground capitalize">
          {run.status}
        </span>
        {run.metrics?.leads_qualified != null && (
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {run.metrics.leads_qualified} leads
          </span>
        )}
      </div>
      <p className="text-[13px] font-medium truncate leading-tight">
        {icpLabel(run)}
      </p>
      <p className="text-[11px] text-muted-foreground mt-0.5">
        {fmtDate(run.started_at)}
      </p>
    </button>
  );
}

function PipelineTracker({
  completedNodes,
  activeNode,
  nodeData,
}: {
  completedNodes: Set<string>;
  activeNode: string | null;
  nodeData: Record<string, Record<string, unknown>>;
}) {
  return (
    <div className="flex flex-col gap-0">
      {PIPELINE_NODES.map((node, idx) => {
        const done = completedNodes.has(node.id);
        const running = activeNode === node.id;
        const pending = !done && !running;
        const data = nodeData[node.id] as
          | { run_metadata?: Record<string, unknown> }
          | undefined;

        return (
          <div key={node.id} className="flex items-start gap-3 py-1.5">
            <div
              className={cn(
                "mt-0.5 h-4 w-4 rounded-sm border flex items-center justify-center shrink-0 text-[10px] font-semibold",
                done && "border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60",
                running && "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/60",
                pending && "border-border text-muted-foreground",
              )}
            >
              {done && <Check className="h-2.5 w-2.5" />}
              {running && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              {pending && <span>{idx + 1}</span>}
            </div>
            <div className="flex flex-col min-w-0">
              <span
                className={cn(
                  "text-[13px]",
                  done && "text-foreground",
                  running && "text-foreground font-medium",
                  pending && "text-muted-foreground",
                )}
              >
                {node.label}
              </span>
              {done && data?.run_metadata && (
                <span className="text-[11px] text-muted-foreground">
                  {Object.entries(data.run_metadata)
                    .filter(([, v]) => v != null)
                    .map(([k, v]) => `${k.replace(/_/g, " ")}: ${String(v)}`)
                    .join(" · ")}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ScorePill({ score }: { score: number | null }) {
  if (score == null) return <span className="text-muted-foreground">—</span>;
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center h-5 min-w-[24px] rounded px-1.5 text-[11px] font-semibold tabular-nums",
        scorePillClass(score),
      )}
    >
      {score}
    </span>
  );
}

function EmailCell({
  email,
  confidence,
}: {
  email: string | null;
  confidence: string | null;
}) {
  if (!email) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 cursor-default">
          {confidence && (
            <span
              className={cn(
                "h-2 w-2 rounded-full shrink-0",
                emailDotClass(confidence),
              )}
            />
          )}
          <span className="text-[13px] truncate max-w-[160px]">{email}</span>
        </span>
      </TooltipTrigger>
      {confidence && (
        <TooltipContent side="top" className="text-[11px]">
          {confidence}
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function LeadStatusSelect({
  leadId,
  status,
  onUpdate,
}: {
  leadId: string;
  status: OutreachStatus;
  onUpdate: (id: string, status: OutreachStatus) => void;
}) {
  const [updating, setUpdating] = useState(false);

  async function handleChange(value: string) {
    setUpdating(true);
    try {
      await prospectingApi.updateLeadStatus(leadId, value as OutreachStatus);
      onUpdate(leadId, value as OutreachStatus);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Select value={status} onValueChange={(v) => void handleChange(v)} disabled={updating}>
      <SelectTrigger className="h-6 text-[11px] w-[130px] px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {(
          [
            "pending",
            "sent",
            "failed",
            "cold",
            "replied",
            "disqualified",
            "meeting_scheduled",
            "lost",
          ] as OutreachStatus[]
        ).map((s) => (
          <SelectItem key={s} value={s} className="text-[12px]">
            {s.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExpandedLeadPanel({ lead }: { lead: LeadItem }) {
  return (
    <div className="px-4 py-3 bg-muted/10 border-t text-[13px] space-y-3">
      {lead.score_reason && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Score reason
          </p>
          <p>{lead.score_reason}</p>
        </div>
      )}
      {lead.suggested_angle && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Suggested angle
          </p>
          <p>{lead.suggested_angle}</p>
        </div>
      )}
      {lead.bant && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            BANT
          </p>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1">
            {Object.entries(lead.bant).map(
              ([k, v]) =>
                v && (
                  <div key={k} className="flex gap-2">
                    <span className="text-[11px] font-medium uppercase text-muted-foreground w-16 shrink-0">
                      {k}
                    </span>
                    <span className="text-[12px]">{String(v)}</span>
                  </div>
                ),
            )}
          </div>
        </div>
      )}
      {lead.red_flags && lead.red_flags.length > 0 && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Red flags
          </p>
          <ul className="space-y-0.5">
            {lead.red_flags.map((flag, i) => (
              <li
                key={i}
                className="text-[12px] text-red-700 border border-red-200 bg-red-50 rounded px-2 py-0.5 inline-block mr-1"
              >
                {flag}
              </li>
            ))}
          </ul>
        </div>
      )}
      {lead.email_subject && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Email
          </p>
          <p className="font-medium text-[12px]">{lead.email_subject}</p>
          {lead.email_body && (
            <p className="mt-1 text-[12px] text-muted-foreground whitespace-pre-wrap line-clamp-6">
              {lead.email_body.replace(/<[^>]+>/g, "")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function RunCompaniesTable({ companies }: { companies: CompanyItem[] }) {
  if (companies.length === 0) {
    return (
      <div className="py-12 text-center text-[13px] text-muted-foreground">
        No companies found for this run.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Company
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Location
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Industry
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Technologies
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Source
          </TableHead>
          <TableHead className="w-16" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {companies.map((co) => (
          <TableRow key={co.id} className="group hover:bg-muted/20 transition-colors">
            <TableCell className="px-3 py-2 text-[13px] font-medium">
              {co.name || "—"}
            </TableCell>
            <TableCell className="px-3 py-2 text-[13px]">
              {[co.city, co.state].filter(Boolean).join(", ") || "—"}
            </TableCell>
            <TableCell className="px-3 py-2 text-[13px]">
              {co.industry || "—"}
            </TableCell>
            <TableCell className="px-3 py-2">
              <div className="flex flex-wrap gap-1">
                {(co.technologies ?? []).slice(0, 2).map((t) => (
                  <span
                    key={t}
                    className="text-[11px] px-1.5 py-0.5 rounded border bg-muted/30"
                  >
                    {t}
                  </span>
                ))}
                {(co.technologies ?? []).length > 2 && (
                  <span className="text-[11px] text-muted-foreground">
                    +{(co.technologies ?? []).length - 2}
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="px-3 py-2">
              {co.source && (
                <span className="text-[11px] px-1.5 py-0.5 rounded border text-muted-foreground">
                  {co.source.replace(/_/g, " ")}
                </span>
              )}
            </TableCell>
            <TableCell className="px-3 py-2">
              <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                {co.website && (
                  <a
                    href={co.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
                {co.linkedin && (
                  <a
                    href={co.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <Linkedin className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RunLeadsTable({
  leads,
  onLeadUpdate,
}: {
  leads: LeadItem[];
  onLeadUpdate: (id: string, status: OutreachStatus) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (leads.length === 0) {
    return (
      <div className="py-12 text-center text-[13px] text-muted-foreground">
        No leads found for this run.
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-6" />
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Contact
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Company
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Email
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Score
          </TableHead>
          <TableHead className="text-[11px] font-medium uppercase tracking-wide">
            Status
          </TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <>
            <TableRow
              key={lead.id}
              className="group hover:bg-muted/20 transition-colors cursor-pointer"
              onClick={() => toggle(lead.id)}
            >
              <TableCell className="px-3 py-2 w-6">
                {expanded.has(lead.id) ? (
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </TableCell>
              <TableCell className="px-3 py-2">
                <p className="text-[13px] font-medium leading-tight">
                  {lead.name || "—"}
                </p>
                <p className="text-[11px] text-muted-foreground">{lead.title || ""}</p>
              </TableCell>
              <TableCell className="px-3 py-2 text-[13px]">
                {lead.company_name || "—"}
              </TableCell>
              <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <EmailCell email={lead.email} confidence={lead.email_confidence} />
              </TableCell>
              <TableCell className="px-3 py-2">
                <ScorePill score={lead.score} />
              </TableCell>
              <TableCell className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
                <LeadStatusSelect
                  leadId={lead.id}
                  status={lead.outreach_status}
                  onUpdate={onLeadUpdate}
                />
              </TableCell>
              <TableCell className="px-3 py-2">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {lead.linkedin && (
                    <a
                      href={lead.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </TableCell>
            </TableRow>
            {expanded.has(lead.id) && (
              <TableRow key={`${lead.id}-expanded`}>
                <TableCell colSpan={7} className="p-0">
                  <ExpandedLeadPanel lead={lead} />
                </TableCell>
              </TableRow>
            )}
          </>
        ))}
      </TableBody>
    </Table>
  );
}

// ─── Launch dialog ────────────────────────────────────────────────────────────

const DEFAULT_FORM: RunCreatePayload = {
  industry: "",
  geo: "",
  produto: "",
  target_titles: [],
  company_size: "10-100 funcionários",
  max_leads: 50,
  min_score: 7,
  dry_run: true,
};

function LaunchDialog({
  open,
  onClose,
  onLaunched,
  initialValues,
}: {
  open: boolean;
  onClose: () => void;
  onLaunched: (run: RunSummary) => void;
  initialValues?: RunCreatePayload;
}) {
  const [form, setForm] = useState<RunCreatePayload>(DEFAULT_FORM);
  const [titlesRaw, setTitlesRaw] = useState("CEO, Diretor, Sócio");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initialValues) {
      setForm(initialValues);
      setTitlesRaw((initialValues.target_titles ?? []).join(", "));
    } else {
      setForm(DEFAULT_FORM);
      setTitlesRaw("CEO, Diretor, Sócio");
    }
  }, [open, initialValues]);

  function set<K extends keyof RunCreatePayload>(key: K, value: RunCreatePayload[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.industry || !form.geo || !form.produto) {
      toast.error("Industry, geo and product are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: RunCreatePayload = {
        ...form,
        target_titles: titlesRaw
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
      };
      const run = await prospectingApi.createRun(payload);
      toast.success("Mission launched");
      onLaunched(run);
      onClose();
      setForm(DEFAULT_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to launch run");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            Launch mission
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Industry *</Label>
              <Input
                className="h-8 text-[13px]"
                placeholder="e.g. energia solar"
                value={form.industry}
                onChange={(e) => set("industry", e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Region *</Label>
              <Input
                className="h-8 text-[13px]"
                placeholder="e.g. São Paulo, SP"
                value={form.geo}
                onChange={(e) => set("geo", e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Product / Service *</Label>
            <Input
              className="h-8 text-[13px]"
              placeholder="What are you selling?"
              value={form.produto}
              onChange={(e) => set("produto", e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px]">Target titles (comma-separated)</Label>
            <Input
              className="h-8 text-[13px]"
              placeholder="CEO, Diretor, Sócio"
              value={titlesRaw}
              onChange={(e) => setTitlesRaw(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Company size</Label>
              <Input
                className="h-8 text-[13px]"
                placeholder="10-100 funcionários"
                value={form.company_size ?? ""}
                onChange={(e) => set("company_size", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Max leads</Label>
              <Input
                type="number"
                className="h-8 text-[13px]"
                min={1}
                max={200}
                value={form.max_leads ?? 50}
                onChange={(e) => set("max_leads", Number(e.target.value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Min score (0-10)</Label>
              <Input
                type="number"
                className="h-8 text-[13px]"
                min={0}
                max={10}
                value={form.min_score ?? 7}
                onChange={(e) => set("min_score", Number(e.target.value))}
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="dry_run"
              checked={form.dry_run ?? true}
              onCheckedChange={(v) => set("dry_run", Boolean(v))}
            />
            <Label htmlFor="dry_run" className="text-[13px] cursor-pointer">
              Dry run (simulate outreach, don't send emails)
            </Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              className="h-8 px-3 text-[13px]"
              onClick={onClose}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="h-8 px-3 text-[13px]"
              disabled={submitting}
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : (
                <Play className="h-3.5 w-3.5 mr-1.5" />
              )}
              Launch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type ResultTab = "companies" | "leads";

export default function AgentPage() {
  const [runs, setRuns] = useState<RunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [resultTab, setResultTab] = useState<ResultTab>("companies");
  const [showLaunch, setShowLaunch] = useState(false);
  const [clonePayload, setClonePayload] = useState<RunCreatePayload | undefined>();
  const [cancelling, setCancelling] = useState(false);

  // SSE state
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [nodeData, setNodeData] = useState<Record<string, Record<string, unknown>>>({});
  const sseRef = useRef<EventSource | null>(null);

  const selectedRun = runs.find((r) => r.run_id === selectedRunId) ?? null;

  useEffect(() => {
    void loadRuns();
  }, []);

  async function loadRuns() {
    try {
      const data = await prospectingApi.listRuns({ limit: 50 });
      setRuns(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load runs");
    }
  }

  const selectRun = useCallback(
    async (run: RunSummary) => {
      if (run.run_id === selectedRunId) return;

      // Close existing SSE
      sseRef.current?.close();
      sseRef.current = null;
      setCompletedNodes(new Set());
      setActiveNode(null);
      setNodeData({});
      setCompanies([]);
      setLeads([]);
      setSelectedRunId(run.run_id);

      if (run.status === "completed" || run.status === "failed" || run.status === "cancelled") {
        await loadRunResults(run.run_id);
      } else {
        openSSE(run.run_id);
      }
    },
    [selectedRunId],
  );

  function openSSE(runId: string) {
    const es = prospectingApi.openRunStream(runId);
    sseRef.current = es;

    const nodeIds = PIPELINE_NODES.map((n) => n.id);

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(String(event.data)) as {
          event: string;
          node: string;
          data: Record<string, unknown>;
        };

        if (parsed.event === "node_complete") {
          const nodeId = parsed.node as NodeId;
          setCompletedNodes((prev) => new Set([...prev, nodeId]));
          setNodeData((prev) => ({ ...prev, [nodeId]: parsed.data }));

          const idx = nodeIds.indexOf(nodeId);
          const next = idx >= 0 && idx + 1 < nodeIds.length ? nodeIds[idx + 1] : null;
          setActiveNode(next);

          setRuns((prev) =>
            prev.map((r) =>
              r.run_id === runId
                ? {
                    ...r,
                    status: "running" as ProspectingRunStatus,
                    metrics: (parsed.data?.run_metadata as RunSummary["metrics"]) ?? r.metrics,
                  }
                : r,
            ),
          );
        }

        if (parsed.event === "started") {
          setActiveNode(nodeIds[0] ?? null);
          setRuns((prev) =>
            prev.map((r) =>
              r.run_id === runId ? { ...r, status: "running" as ProspectingRunStatus } : r,
            ),
          );
        }

        if (parsed.event === "completed") {
          es.close();
          sseRef.current = null;
          setActiveNode(null);
          setCompletedNodes(new Set(nodeIds));
          void finalizeRun(runId);
        }

        if (parsed.event === "error" || parsed.event === "cancelled") {
          es.close();
          sseRef.current = null;
          setActiveNode(null);
          const nextStatus = parsed.event === "cancelled" ? "cancelled" : "failed";
          setRuns((prev) =>
            prev.map((r) =>
              r.run_id === runId ? { ...r, status: nextStatus as ProspectingRunStatus } : r,
            ),
          );
          if (parsed.event === "error") {
            const msg =
              typeof parsed.data?.error === "string" ? parsed.data.error : "Agent error";
            toast.error(msg);
          }
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      // SSE closed or lost — don't retry automatically
      es.close();
      sseRef.current = null;
    };
  }

  async function finalizeRun(runId: string) {
    try {
      const updated = await prospectingApi.getRun(runId);
      setRuns((prev) => prev.map((r) => (r.run_id === runId ? updated : r)));
    } catch {
      // ignore
    }
    await loadRunResults(runId);
  }

  async function loadRunResults(runId: string) {
    try {
      const [coList, leadList] = await Promise.all([
        prospectingApi.listRunCompanies(runId),
        prospectingApi.listRunLeads(runId),
      ]);
      setCompanies(coList);
      setLeads(leadList);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load results");
    }
  }

  async function handleCancel() {
    if (!selectedRunId) return;
    setCancelling(true);
    try {
      await prospectingApi.cancelRun(selectedRunId);
      sseRef.current?.close();
      sseRef.current = null;
      setActiveNode(null);
      setRuns((prev) =>
        prev.map((r) =>
          r.run_id === selectedRunId ? { ...r, status: "cancelled" as ProspectingRunStatus } : r,
        ),
      );
      toast.success("Run cancelled");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to cancel run");
    } finally {
      setCancelling(false);
    }
  }

  function handleLaunched(run: RunSummary) {
    setRuns((prev) => [run, ...prev]);
    void selectRun(run);
  }

  function handleLeadUpdate(id: string, status: OutreachStatus) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, outreach_status: status } : l)));
  }

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      sseRef.current?.close();
    };
  }, []);

  const isLive =
    selectedRun?.status === "pending" || selectedRun?.status === "running";

  return (
    <div className="flex flex-1 h-full overflow-hidden">
      {/* Left rail */}
      <div className="w-64 border-r flex flex-col shrink-0 overflow-hidden">
        <div className="px-3 py-2.5 border-b flex items-center justify-between shrink-0">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Runs
          </span>
          <Button
            size="sm"
            className="h-6 px-2.5 text-[12px]"
            onClick={() => setShowLaunch(true)}
          >
            + New
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {runs.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              No runs yet.
              <br />
              Launch your first mission.
            </div>
          ) : (
            runs.map((run) => (
              <RunListItem
                key={run.run_id}
                run={run}
                active={run.run_id === selectedRunId}
                onClick={() => void selectRun(run)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedRun ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div>
              <p className="text-[15px] font-semibold tracking-tight mb-1">
                AI Prospecting Agent
              </p>
              <p className="text-[13px] text-muted-foreground max-w-xs">
                Launch a mission to find and qualify leads. The agent will scout,
                enrich, and score companies for outreach.
              </p>
            </div>
            <Button className="h-8 px-4 text-[13px]" onClick={() => setShowLaunch(true)}>
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Launch mission
            </Button>
          </div>
        ) : (
          <>
            {/* Run header */}
            <div className="px-5 py-3 border-b shrink-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full shrink-0",
                        statusDotClass(selectedRun.status),
                      )}
                    />
                    <span className="text-[12px] text-muted-foreground capitalize">
                      {selectedRun.status}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {selectedRun.run_id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold tracking-tight">
                    {icpLabel(selectedRun)}
                  </p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {fmtDate(selectedRun.started_at)}
                    {selectedRun.finished_at &&
                      ` → ${fmtDate(selectedRun.finished_at)}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedRun.metrics && (
                    <div className="flex gap-4 text-right">
                      {selectedRun.metrics.leads_found != null && (
                        <div>
                          <p className="text-[18px] font-semibold tabular-nums leading-none">
                            {selectedRun.metrics.leads_found}
                          </p>
                          <p className="text-[11px] text-muted-foreground">found</p>
                        </div>
                      )}
                      {selectedRun.metrics.leads_qualified != null && (
                        <div>
                          <p className="text-[18px] font-semibold tabular-nums leading-none">
                            {selectedRun.metrics.leads_qualified}
                          </p>
                          <p className="text-[11px] text-muted-foreground">qualified</p>
                        </div>
                      )}
                      {selectedRun.metrics.avg_score != null && (
                        <div>
                          <p className="text-[18px] font-semibold tabular-nums leading-none">
                            {selectedRun.metrics.avg_score.toFixed(1)}
                          </p>
                          <p className="text-[11px] text-muted-foreground">avg score</p>
                        </div>
                      )}
                    </div>
                  )}
                  {!isLive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[12px]"
                      onClick={() => {
                        setClonePayload(icpToPayload(selectedRun.icp));
                        setShowLaunch(true);
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Reuse params
                    </Button>
                  )}
                  {isLive && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-3 text-[12px]"
                      onClick={() => void handleCancel()}
                      disabled={cancelling}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Body */}
            {isLive ? (
              /* Pipeline tracker */
              <div className="flex-1 overflow-y-auto p-5">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-3">
                  Pipeline
                </p>
                <PipelineTracker
                  completedNodes={completedNodes}
                  activeNode={activeNode}
                  nodeData={nodeData}
                />
              </div>
            ) : (
              /* Results tabs */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Tab bar */}
                <div className="flex border-b px-5 shrink-0">
                  {(["companies", "leads"] as ResultTab[]).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setResultTab(tab)}
                      className={cn(
                        "px-0 py-2.5 mr-5 text-[13px] font-medium border-b-2 -mb-px transition-colors",
                        resultTab === tab
                          ? "border-foreground text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {tab === "companies"
                        ? `Companies (${companies.length})`
                        : `Leads (${leads.length})`}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto">
                  {resultTab === "companies" ? (
                    <RunCompaniesTable companies={companies} />
                  ) : (
                    <RunLeadsTable leads={leads} onLeadUpdate={handleLeadUpdate} />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <LaunchDialog
        open={showLaunch}
        onClose={() => { setShowLaunch(false); setClonePayload(undefined); }}
        onLaunched={handleLaunched}
        initialValues={clonePayload}
      />
    </div>
  );
}
