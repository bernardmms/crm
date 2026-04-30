import { apiClient } from "@/lib/api-client";
import { leadAgentClient } from "@/lib/lead-agent-client";
import type { RunCreatePayload } from "@/lib/prospecting-api";
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
  Globe,
  Linkedin,
  Loader2,
  Play,
  Search,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { z } from "zod";
import type {
  jobSummarySchema,
  agentLeadSchema,
  leadCompanySchema,
} from "@repo/api-contract";

// ── Types from contract ────────────────────────────────────────────

type JobSummary = z.infer<typeof jobSummarySchema>;
type AgentLead = z.infer<typeof agentLeadSchema>;
type LeadCompany = z.infer<typeof leadCompanySchema>;
type JobStatus = string;

// ── Pipeline config ────────────────────────────────────────────────

const PIPELINE_NODES = [
  { id: "queued", label: "Queued" },
  { id: "parsing_icp", label: "Parse ICP" },
  { id: "searching", label: "Search companies" },
  { id: "scoring", label: "Score & filter" },
  { id: "finding_leads", label: "Find leads" },
  { id: "enriching", label: "Enrich & qualify" },
] as const;

type NodeId = (typeof PIPELINE_NODES)[number]["id"];

const FINAL_STATUSES = new Set(["completed", "partial", "failed"]);
const STAGE_ORDER = PIPELINE_NODES.map((n) => n.id);
const STAGE_ALIASES: Record<string, NodeId> = {
  queued: "queued",
  pending: "queued",
  parsing_icp: "parsing_icp",
  search_companies: "searching",
  searching: "searching",
  score_leads: "scoring",
  scoring: "scoring",
  filter_leads: "scoring",
  find_leads: "finding_leads",
  finding_leads: "finding_leads",
  enrich_companies: "enriching",
  enriching: "enriching",
  contact_qualified: "enriching",
};

const OUTREACH_STATUSES = [
  "pending",
  "sent",
  "failed",
  "cold",
  "replied",
  "disqualified",
  "meeting_scheduled",
  "lost",
] as const;

// ── Helpers ────────────────────────────────────────────────────────

function statusDotClass(status: JobStatus) {
  return (
    {
      queued: "bg-amber-400",
      pending: "bg-amber-400",
      searching: "bg-blue-500 animate-pulse",
      parsing_icp: "bg-blue-500 animate-pulse",
      scoring: "bg-blue-500 animate-pulse",
      finding_leads: "bg-blue-500 animate-pulse",
      enriching: "bg-blue-500 animate-pulse",
      running: "bg-blue-500 animate-pulse",
      completed: "bg-emerald-500",
      failed: "bg-red-500",
      cancelled: "bg-muted-foreground",
    }[status] ?? "bg-muted-foreground"
  );
}

function normalizeStage(stage: string | null | undefined): NodeId | null {
  if (!stage) return null;
  return STAGE_ALIASES[stage] ?? null;
}

function buildNodeData(
  stageCounts: Record<string, number> | null | undefined,
  totalLeads?: number | null,
  progress?: number | null,
) {
  const next: Record<string, Record<string, unknown>> = {};

  if (stageCounts) {
    for (const [stage, count] of Object.entries(stageCounts)) {
      const normalized = normalizeStage(stage);
      if (!normalized) continue;
      next[normalized] = {
        run_metadata: {
          ...(next[normalized]?.run_metadata as Record<string, unknown> | undefined),
          found: count,
        },
      };
    }
  }

  if (totalLeads != null) {
    next.finding_leads = {
      run_metadata: {
        ...(next.finding_leads?.run_metadata as Record<string, unknown> | undefined),
        leads: totalLeads,
      },
    };
  }

  if (progress != null) {
    next.queued = {
      run_metadata: {
        ...(next.queued?.run_metadata as Record<string, unknown> | undefined),
        progress: `${Math.round(progress)}%`,
      },
    };
  }

  return next;
}

function scorePillClass(score: number) {
  if (score >= 8) return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60";
  if (score >= 6) return "bg-amber-50 text-amber-700 dark:bg-amber-950/60";
  return "bg-red-50 text-red-700 dark:bg-red-950/60";
}

function emailDotClass(confidence: number | null) {
  if (confidence == null) return "bg-muted-foreground";
  if (confidence >= 0.9) return "bg-emerald-500";
  if (confidence >= 0.6) return "bg-amber-400";
  return "bg-violet-400";
}

function ensureAbsoluteUrl(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function linkedinProfileFromHandle(value: string | null | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) {
    return { url: trimmed, label: trimmed.replace(/^https?:\/\//i, "") };
  }
  const normalized = trimmed.replace(/^@+/, "").replace(/^\/+/, "");
  const path = normalized.includes("/") ? normalized : `company/${normalized}`;
  return { url: `https://www.linkedin.com/${path}`, label: normalized };
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
    max_companies: typeof icp.max_companies === "number" ? icp.max_companies : undefined,
  };
}

function fmtDate(d: Date | string) {
  return new Date(d).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function icpLabel(job: JobSummary) {
  const icp = job.icp as Record<string, string>;
  const composed = [icp.industry, icp.geo].filter(Boolean).join(" · ");
  return composed || job.job_name || "?";
}

// ── Sub-components ────────────────────────────────────────────────

function RunListItem({
  job,
  active,
  onClick,
}: {
  job: JobSummary;
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
        <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", statusDotClass(job.status))} />
        <span className="text-[12px] text-muted-foreground capitalize">{job.status}</span>
        {job.metrics?.leads_qualified != null && (
          <span className="ml-auto text-[11px] text-muted-foreground tabular-nums">
            {job.metrics.leads_qualified} leads
          </span>
        )}
      </div>
      <p className="text-[13px] font-medium truncate leading-tight">{icpLabel(job)}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{fmtDate(job.started_at)}</p>
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
        const data = nodeData[node.id] as { run_metadata?: Record<string, unknown> } | undefined;
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

function ScorePill({ score }: { score: number | null | undefined }) {
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
  email: string | null | undefined;
  confidence: number | null | undefined;
}) {
  if (!email) return <span className="text-muted-foreground">—</span>;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex items-center gap-1.5 cursor-default">
          <span className={cn("h-2 w-2 rounded-full shrink-0", emailDotClass(confidence ?? null))} />
          <span className="text-[13px] truncate max-w-[160px]">{email}</span>
        </span>
      </TooltipTrigger>
      {confidence != null && (
        <TooltipContent side="top" className="text-[11px]">
          confidence: {Math.round(confidence * 100)}%
        </TooltipContent>
      )}
    </Tooltip>
  );
}

function LeadStatusSelect({
  lead,
  jobId,
  onUpdate,
}: {
  lead: AgentLead;
  jobId: string;
  onUpdate: (id: number, status: string) => void;
}) {
  const [updating, setUpdating] = useState(false);

  async function handleChange(value: string) {
    setUpdating(true);
    try {
      const res = await apiClient.leadAgentContract.updateLeadStatus({
        params: { jobId, leadId: lead.id },
        body: { status: value },
      });
      if (res.status === 200) onUpdate(lead.id, value);
      else toast.error("Failed to update status");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setUpdating(false);
    }
  }

  return (
    <Select
      value={lead.outreach_status}
      onValueChange={(v) => void handleChange(v)}
      disabled={updating}
    >
      <SelectTrigger className="h-6 text-[11px] w-[130px] px-2">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {OUTREACH_STATUSES.map((s) => (
          <SelectItem key={s} value={s} className="text-[12px]">
            {s.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ExpandedLeadPanel({ lead }: { lead: AgentLead }) {
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
      {lead.outreach_angle && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Suggested angle
          </p>
          <p>{lead.outreach_angle}</p>
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
      {lead.phone && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Phone
          </p>
          <p className="text-[13px]">{lead.phone}</p>
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
      {(lead.follow_up_1 || lead.follow_up_2) && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
            Follow-ups
          </p>
          {lead.follow_up_1 && (
            <div className="mb-1.5">
              <span className="text-[10px] font-medium text-muted-foreground uppercase mr-1.5">
                #1
              </span>
              <span className="text-[12px] text-muted-foreground whitespace-pre-wrap">
                {lead.follow_up_1.replace(/<[^>]+>/g, "")}
              </span>
            </div>
          )}
          {lead.follow_up_2 && (
            <div>
              <span className="text-[10px] font-medium text-muted-foreground uppercase mr-1.5">
                #2
              </span>
              <span className="text-[12px] text-muted-foreground whitespace-pre-wrap">
                {lead.follow_up_2.replace(/<[^>]+>/g, "")}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Companies table ────────────────────────────────────────────────

function RunCompaniesTable({
  companies,
  jobId,
  onCompanyDelete,
}: {
  companies: LeadCompany[];
  jobId: string;
  onCompanyDelete: (id: number) => void;
}) {
  const [deleting, setDeleting] = useState<Set<number>>(new Set());

  async function handleDeleteCompany(companyId: number) {
    setDeleting((prev) => new Set([...prev, companyId]));
    try {
      const res = await apiClient.leadAgentContract.deleteCompany({
        params: { jobId, companyId },
        body: undefined,
      });
      if (res.status === 200) {
        onCompanyDelete(companyId);
      } else {
        toast.error("Failed to delete company");
      }
    } catch {
      toast.error("Failed to delete company");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(companyId);
        return next;
      });
    }
  }

  if (companies.length === 0) {
    return (
      <div className="py-12 text-center text-[13px] text-muted-foreground">
        No companies found for this run.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="md:hidden px-4 py-3 space-y-2.5">
        {companies.map((co) => {
          const website = ensureAbsoluteUrl(co.website ?? co.domain);
          const linkedin = linkedinProfileFromHandle(co.linkedin_url);
          const fullAddress =
            [co.address, co.city, co.state, co.zip_code].filter(Boolean).join(", ");
          return (
            <div key={co.id} className="rounded-lg border bg-background px-3.5 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[13px] font-medium leading-tight">{co.name || "—"}</p>
                  {co.sector && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{co.sector}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {website && (
                    <a
                      href={website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    >
                      <Globe className="h-3.5 w-3.5" />
                    </a>
                  )}
                  {linkedin && (
                    <a
                      href={linkedin.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => void handleDeleteCompany(co.id)}
                    disabled={deleting.has(co.id)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                  >
                    {deleting.has(co.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <p className="mt-2 text-[12px] text-muted-foreground">{fullAddress || "—"}</p>
              {co.technologies.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {co.technologies.slice(0, 5).map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                  {co.technologies.length > 5 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                      +{co.technologies.length - 5}
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="hidden md:block w-full overflow-x-auto">
        <Table className="min-w-[860px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[22%] px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                Company
              </TableHead>
              <TableHead className="w-[15%] px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                Sector
              </TableHead>
              <TableHead className="w-[28%] px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                Address
              </TableHead>
              <TableHead className="w-[23%] px-4 py-3 text-[11px] font-medium uppercase tracking-wide">
                Technologies
              </TableHead>
              <TableHead className="w-[12%] px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-center">
                Links
              </TableHead>
              <TableHead className="w-[10%] px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {companies.map((co) => {
              const website = ensureAbsoluteUrl(co.website ?? co.domain);
              const linkedin = linkedinProfileFromHandle(co.linkedin_url);
              const fullAddress =
                [co.address, co.city, co.state, co.zip_code].filter(Boolean).join(", ");
              return (
                <TableRow key={co.id} className="hover:bg-muted/20">
                  <TableCell className="px-4 py-3 text-[13px] font-medium">
                    <span className="block truncate">{co.name || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[12px] text-muted-foreground">
                    <span className="block truncate">{co.sector || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-[13px] text-muted-foreground">
                    <span className="block line-clamp-2">{fullAddress || "—"}</span>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    {co.technologies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {co.technologies.slice(0, 4).map((t) => (
                          <span
                            key={t}
                            className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                        {co.technologies.length > 4 && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground">
                            +{co.technologies.length - 4}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-[12px] text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex justify-center gap-1.5">
                      {website && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            >
                              <Globe className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent className="text-[11px]">{website}</TooltipContent>
                        </Tooltip>
                      )}
                      {linkedin && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <a
                              href={linkedin.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                            >
                              <Linkedin className="h-3.5 w-3.5" />
                            </a>
                          </TooltipTrigger>
                          <TooltipContent className="text-[11px]">{linkedin.label}</TooltipContent>
                        </Tooltip>
                      )}
                      {!website && !linkedin && (
                        <span className="text-[12px] text-muted-foreground">—</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <div className="flex justify-center">
                      <button
                        onClick={() => void handleDeleteCompany(co.id)}
                        disabled={deleting.has(co.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                      >
                        {deleting.has(co.id) ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Leads table ────────────────────────────────────────────────────

function RunLeadsTable({
  leads,
  jobId,
  onLeadUpdate,
  onLeadDelete,
  onAddToList,
}: {
  leads: AgentLead[];
  jobId: string;
  onLeadUpdate: (id: number, status: string) => void;
  onLeadDelete: (id: number) => void;
  onAddToList: (ids: number[]) => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");

  const filteredLeads = search.trim()
    ? leads.filter((l) => {
        const q = search.toLowerCase();
        return (
          l.full_name?.toLowerCase().includes(q) ||
          l.email?.toLowerCase().includes(q) ||
          l.role?.toLowerCase().includes(q) ||
          l.company_name?.toLowerCase().includes(q)
        );
      })
    : leads;

  function toggle(id: number) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSelect(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(
      selected.size === filteredLeads.length
        ? new Set()
        : new Set(filteredLeads.map((l) => l.id)),
    );
  }

  async function handleDeleteLead(id: number) {
    setDeleting((prev) => new Set([...prev, id]));
    try {
      const res = await apiClient.leadAgentContract.deleteLead({
        params: { jobId, leadId: id },
      });
      if (res.status === 200) {
        onLeadDelete(id);
        setSelected((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } else {
        toast.error("Failed to delete lead");
      }
    } catch {
      toast.error("Failed to delete lead");
    } finally {
      setDeleting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  const allSelected = filteredLeads.length > 0 && selected.size === filteredLeads.length;
  const someSelected = selected.size > 0;

  return (
    <div className="w-full flex flex-col">
      <div className="px-4 py-2 border-b shrink-0">
        <div className="relative max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
          <Input
            className="h-7 pl-8 text-[13px]"
            placeholder="Search leads…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      {someSelected && (
        <div className="flex items-center gap-2 px-5 py-2 border-b bg-muted/10 shrink-0">
          <span className="text-[12px] text-muted-foreground">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2.5 text-[12px] ml-1"
            onClick={() => onAddToList([...selected])}
          >
            <UserPlus className="h-3 w-3 mr-1" />
            Add to list
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-6 px-2.5 text-[12px] text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
            onClick={() => void Promise.all([...selected].map((id) => handleDeleteLead(id)))}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Delete selected
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[12px] ml-auto"
            onClick={() => setSelected(new Set())}
          >
            Clear
          </Button>
        </div>
      )}

      {filteredLeads.length === 0 && (
        <div className="py-12 text-center text-[13px] text-muted-foreground">
          {search ? "No leads match your search." : "No leads found for this run."}
        </div>
      )}

      {/* Mobile */}
      <div className="md:hidden px-4 py-3 space-y-2.5">
        {filteredLeads.map((lead) => {
          const linkedin = linkedinProfileFromHandle(lead.linkedin_url);
          const isExpanded = expanded.has(lead.id);
          const isSelected = selected.has(lead.id);
          return (
            <div
              key={lead.id}
              className={cn(
                "rounded-lg border bg-background",
                isSelected && "border-primary/50 bg-primary/5",
              )}
            >
              <div className="flex items-center gap-2 px-3.5 pt-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => toggleSelect(lead.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <button
                  className="flex-1 flex items-start gap-2 text-left"
                  onClick={() => toggle(lead.id)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium leading-tight truncate">
                      {lead.full_name || "—"}
                    </p>
                    <p className="text-[11px] text-muted-foreground truncate">{lead.role || "—"}</p>
                  </div>
                  <ScorePill score={lead.score} />
                </button>
              </div>
              <div className="px-3.5 pb-3.5 space-y-2.5 mt-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      Company
                    </p>
                    <p className="text-[12px] truncate">{lead.company_name || "—"}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {linkedin && (
                      <a
                        href={linkedin.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                      >
                        <Linkedin className="h-3.5 w-3.5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        void handleDeleteLead(lead.id);
                      }}
                      disabled={deleting.has(lead.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                    >
                      {deleting.has(lead.id) ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Email
                  </p>
                  <EmailCell email={lead.email} confidence={lead.email_confidence} />
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Status
                  </p>
                  <LeadStatusSelect lead={lead} jobId={jobId} onUpdate={onLeadUpdate} />
                </div>
              </div>
              {isExpanded && <ExpandedLeadPanel lead={lead} />}
            </div>
          );
        })}
      </div>

      {/* Desktop */}
      <div className="hidden md:block w-full overflow-x-auto px-2">
        <Table className="min-w-[1020px] table-fixed">
          <TableHeader>
            <TableRow>
              <TableHead className="w-8 pl-5 py-3.5">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all"
                />
              </TableHead>
              <TableHead className="w-8 pl-1 py-3.5" />
              <TableHead className="w-[23%] px-5 py-3.5 text-[11px] font-medium uppercase tracking-wide">
                Contact
              </TableHead>
              <TableHead className="w-[17%] px-5 py-3.5 text-[11px] font-medium uppercase tracking-wide">
                Company
              </TableHead>
              <TableHead className="w-[25%] px-5 py-3.5 text-[11px] font-medium uppercase tracking-wide">
                Email
              </TableHead>
              <TableHead className="w-20 px-5 py-3.5 text-[11px] font-medium uppercase tracking-wide">
                Score
              </TableHead>
              <TableHead className="w-[160px] px-5 py-3.5 text-[11px] font-medium uppercase tracking-wide">
                Status
              </TableHead>
              <TableHead className="w-24 px-4 py-3.5 text-[11px] font-medium uppercase tracking-wide text-center">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredLeads.map((lead) => {
              const linkedin = linkedinProfileFromHandle(lead.linkedin_url);
              const isExpanded = expanded.has(lead.id);
              const isSelected = selected.has(lead.id);
              return (
                <Fragment key={lead.id}>
                  <TableRow
                    className={cn(
                      "group hover:bg-muted/20 cursor-pointer",
                      isSelected && "bg-primary/5 hover:bg-primary/10",
                    )}
                    onClick={() => toggle(lead.id)}
                  >
                    <TableCell
                      className="px-5 py-3.5 w-8"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(lead.id)}
                      />
                    </TableCell>
                    <TableCell className="pl-1 py-3.5 w-8">
                      {isExpanded ? (
                        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <p className="text-[13px] font-medium leading-tight">
                        {lead.full_name || "—"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{lead.role || ""}</p>
                    </TableCell>
                    <TableCell className="px-5 py-3.5 text-[13px]">
                      <span className="block truncate">{lead.company_name || "—"}</span>
                    </TableCell>
                    <TableCell
                      className="px-5 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <EmailCell email={lead.email} confidence={lead.email_confidence} />
                    </TableCell>
                    <TableCell className="px-5 py-3.5">
                      <ScorePill score={lead.score} />
                    </TableCell>
                    <TableCell
                      className="px-5 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LeadStatusSelect lead={lead} jobId={jobId} onUpdate={onLeadUpdate} />
                    </TableCell>
                    <TableCell
                      className="px-4 py-3.5"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex justify-center gap-1">
                        {linkedin && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <a
                                href={linkedin.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground hover:bg-muted/40"
                              >
                                <Linkedin className="h-3 w-3" />
                              </a>
                            </TooltipTrigger>
                            <TooltipContent className="text-[11px]">LinkedIn</TooltipContent>
                          </Tooltip>
                        )}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteLead(lead.id);
                              }}
                              disabled={deleting.has(lead.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground hover:text-red-600 hover:border-red-200 disabled:opacity-50"
                            >
                              {deleting.has(lead.id) ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Trash2 className="h-3 w-3" />
                              )}
                            </button>
                          </TooltipTrigger>
                          <TooltipContent className="text-[11px]">Delete lead</TooltipContent>
                        </Tooltip>
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <ExpandedLeadPanel lead={lead} />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Add to list dialog ─────────────────────────────────────────────

type ContactListOption = { id: string; name: string };

function AddToListDialog({
  open,
  leadIds,
  onClose,
}: {
  open: boolean;
  leadIds: number[];
  onClose: () => void;
}) {
  const [lists, setLists] = useState<ContactListOption[]>([]);
  const [selectedList, setSelectedList] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedList("");
    setLoading(true);
    void apiClient.contactListContract
      .listContactLists()
      .then((res) => {
        if (res.status === 200) {
          setLists(res.body.lists.map((l) => ({ id: l.id, name: l.name })));
        }
      })
      .finally(() => setLoading(false));
  }, [open]);

  async function handleImport() {
    if (!selectedList) return;
    setSubmitting(true);
    try {
      const res = await apiClient.leadAgentContract.importLeads({
        body: { listId: selectedList, leadIds },
      });
      if (res.status === 200) {
        const { imported, skipped, errors } = res.body;
        toast.success(
          `${imported} imported, ${skipped} skipped${errors > 0 ? `, ${errors} errors` : ""}`,
        );
        onClose();
      } else {
        toast.error("Failed to import leads");
      }
    } catch {
      toast.error("Failed to import leads");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-[15px] font-semibold tracking-tight">
            Add {leadIds.length} lead{leadIds.length !== 1 ? "s" : ""} to list
          </DialogTitle>
        </DialogHeader>
        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : lists.length === 0 ? (
            <p className="text-[13px] text-muted-foreground text-center py-4">
              No contact lists found. Create one first.
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-[12px]">Contact list</Label>
              <Select value={selectedList} onValueChange={setSelectedList}>
                <SelectTrigger className="h-8 text-[13px]">
                  <SelectValue placeholder="Select a list…" />
                </SelectTrigger>
                <SelectContent>
                  {lists.map((l) => (
                    <SelectItem key={l.id} value={l.id} className="text-[13px]">
                      {l.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="ghost"
            className="h-8 px-3 text-[13px]"
            onClick={onClose}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            className="h-8 px-3 text-[13px]"
            disabled={!selectedList || submitting || loading}
            onClick={() => void handleImport()}
          >
            {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />}
            Import
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Launch dialog ──────────────────────────────────────────────────

const DEFAULT_FORM: RunCreatePayload = {
  industry: "",
  geo: "",
  produto: "",
  target_titles: [],
  company_size: "10-100 funcionários",
  max_leads: 20,
  min_score: 5,
  max_companies: 30,
};

function LaunchDialog({
  open,
  onClose,
  onLaunched,
  initialValues,
}: {
  open: boolean;
  onClose: () => void;
  onLaunched: (jobId: string, icp: Record<string, unknown>) => void;
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
    if (submitting) return;
    if (!form.industry || !form.geo || !form.produto) {
      toast.error("Industry, geo and product are required");
      return;
    }
    setSubmitting(true);
    try {
      const payload: RunCreatePayload = {
        ...form,
        target_titles: titlesRaw.split(",").map((s) => s.trim()).filter(Boolean),
      };
      const response = await leadAgentClient.createJob(payload);
      toast.success("Mission launched");
      onLaunched(response.job_id, payload as Record<string, unknown>);
      onClose();
      setForm(DEFAULT_FORM);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to launch mission");
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
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px]">Company size</Label>
              <Input
                className="h-8 text-[13px]"
                value={form.company_size ?? ""}
                onChange={(e) => set("company_size", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px]">Max companies</Label>
              <Input
                type="number"
                className="h-8 text-[13px]"
                min={1}
                value={form.max_companies ?? 100}
                onChange={(e) => set("max_companies", Number(e.target.value))}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <Button type="submit" className="h-8 px-3 text-[13px]" disabled={submitting}>
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

// ── Main page ──────────────────────────────────────────────────────

type ResultTab = "companies" | "leads";

export default function AgentPage() {
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [companies, setCompanies] = useState<LeadCompany[]>([]);
  const [leads, setLeads] = useState<AgentLead[]>([]);
  const [resultTab, setResultTab] = useState<ResultTab>("companies");
  const [showLaunch, setShowLaunch] = useState(false);
  const [cloneIcp, setCloneIcp] = useState<RunCreatePayload | undefined>();
  const [deletingJob, setDeletingJob] = useState(false);
  const [addToListIds, setAddToListIds] = useState<number[]>([]);

  // Polling state
  const [completedNodes, setCompletedNodes] = useState<Set<string>>(new Set());
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const [nodeData, setNodeData] = useState<Record<string, Record<string, unknown>>>({});
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollDelayRef = useRef<number>(2000);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const isLive = selectedJob?.status === "queued" || selectedJob?.status === "pending" ||
    (selectedJob?.status != null && !FINAL_STATUSES.has(selectedJob.status) && selectedJob.status !== "cancelled");

  useEffect(() => {
    void loadJobs();
  }, []);

  async function loadJobs() {
    try {
      const res = await apiClient.leadAgentContract.listJobs();
      if (res.status === 200) setJobs(res.body.jobs);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load jobs");
    }
  }

  function stopPolling() {
    if (pollTimerRef.current != null) {
      clearTimeout(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollDelayRef.current = 2000;
  }

  const selectJob = useCallback(
    async (job: JobSummary) => {
      if (job.id === selectedJobId) return;
      stopPolling();
      setCompletedNodes(new Set());
      setActiveNode(null);
      setNodeData({});
      setCompanies([]);
      setLeads([]);
      setSelectedJobId(job.id);

      if (FINAL_STATUSES.has(job.status) || job.status === "cancelled") {
        await loadJobResults(job.id);
      } else {
        startPolling(job.id);
      }
    },
    [selectedJobId], // eslint-disable-line react-hooks/exhaustive-deps
  );

  function startPolling(jobId: string) {
    pollDelayRef.current = 2000;

    async function poll() {
      try {
        const response = await leadAgentClient.getJobStatus(jobId);
        const { status, progress, current_funnel_stage, stage_counts, total_leads } = response;

        // derive completed + active nodes from current stage
        const normalizedStage = normalizeStage(current_funnel_stage);
        const stageIdx = normalizedStage ? STAGE_ORDER.indexOf(normalizedStage) : -1;
        if (stageIdx >= 0 && normalizedStage) {
          setCompletedNodes(new Set(STAGE_ORDER.slice(0, stageIdx)));
          setActiveNode(normalizedStage);
        } else if (status === "failed" || status === "completed" || status === "partial") {
          setActiveNode(null);
        }

        // populate nodeData from stage_counts for metadata display
        setNodeData(buildNodeData(stage_counts, total_leads, progress));

        setJobs((prev) =>
          prev.map((j) =>
            j.id === jobId
              ? {
                  ...j,
                  status,
                  progress: progress ?? null,
                  current_funnel_stage: normalizedStage ?? current_funnel_stage ?? null,
                }
              : j,
          ),
        );

        if (FINAL_STATUSES.has(status)) {
          setActiveNode(null);
          if (status !== "failed") setCompletedNodes(new Set(STAGE_ORDER));
          void finalizeJob(jobId);
          return;
        }

        if (status === "cancelled") {
          setActiveNode(null);
          setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, status: "cancelled" } : j)));
          return;
        }
      } catch {
        // network error — retry with backoff
      }

      // 2s → 4s → 6s → 8s → 10s (capped)
      pollTimerRef.current = setTimeout(() => void poll(), pollDelayRef.current);
      pollDelayRef.current = Math.min(pollDelayRef.current + 2000, 10000);
    }

    pollTimerRef.current = setTimeout(() => void poll(), 2000);
  }

  async function finalizeJob(jobId: string) {
    try {
      const res = await apiClient.leadAgentContract.getJob({ params: { jobId } });
      if (res.status === 200) {
        setJobs((prev) => prev.map((j) => (j.id === jobId ? res.body : j)));
      }
    } catch {
      // ignore
    }
    await loadJobResults(jobId);
  }

  async function loadJobResults(jobId: string) {
    try {
      const [coRes, leadRes] = await Promise.all([
        apiClient.leadAgentContract.listJobCompanies({ params: { jobId } }),
        apiClient.leadAgentContract.listLeads({
          params: { jobId },
          query: { page: 1, limit: 200 },
        }),
      ]);
      if (coRes.status === 200) setCompanies(coRes.body.companies);
      if (leadRes.status === 200) setLeads(leadRes.body.leads);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to load results");
    }
  }

  async function handleDeleteJob() {
    if (!selectedJobId) return;
    setDeletingJob(true);
    try {
      const res = await apiClient.leadAgentContract.deleteJob({
        params: { jobId: selectedJobId },
        body: undefined,
      });
      if (res.status === 200) {
        sseRef.current?.close();
        sseRef.current = null;
        setJobs((prev) => prev.filter((j) => j.id !== selectedJobId));
        setSelectedJobId(null);
        setCompanies([]);
        setLeads([]);
        toast.success("Run deleted");
      } else {
        toast.error("Failed to delete run");
      }
    } catch {
      toast.error("Failed to delete run");
    } finally {
      setDeletingJob(false);
    }
  }

  function handleLaunched(jobId: string, icp: Record<string, unknown>) {
    const optimistic: JobSummary = {
      id: jobId,
      status: "pending",
      icp,
      progress: null,
      current_funnel_stage: null,
      metrics: null,
      started_at: new Date(),
      finished_at: null,
    };
    setJobs((prev) => [optimistic, ...prev]);
    void selectJob(optimistic);
  }

  function handleLeadUpdate(id: number, status: string) {
    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, outreach_status: status } : l)));
  }

  function handleLeadDelete(id: number) {
    setLeads((prev) => prev.filter((l) => l.id !== id));
  }

  function handleCompanyDelete(id: number) {
    setCompanies((prev) => prev.filter((company) => company.id !== id));
    setLeads((prev) => prev.filter((lead) => lead.company_id !== id));
  }

  useEffect(() => {
    return () => stopPolling();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
          {jobs.length === 0 ? (
            <div className="px-3 py-6 text-center text-[12px] text-muted-foreground">
              No runs yet.
              <br />
              Launch your first mission.
            </div>
          ) : (
            jobs.map((job) => (
              <RunListItem
                key={job.id}
                job={job}
                active={job.id === selectedJobId}
                onClick={() => void selectJob(job)}
              />
            ))
          )}
        </div>
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {!selectedJob ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
            <div>
              <p className="text-[15px] font-semibold tracking-tight mb-1">
                AI Prospecting Agent
              </p>
              <p className="text-[13px] text-muted-foreground max-w-xs">
                Launch a mission to find and qualify leads. The agent will scout, enrich, and score
                companies for outreach.
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
                        statusDotClass(selectedJob.status),
                      )}
                    />
                    <span className="text-[12px] text-muted-foreground capitalize">
                      {selectedJob.status}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground">
                      {selectedJob.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-[15px] font-semibold tracking-tight">{icpLabel(selectedJob)}</p>
                  <p className="text-[12px] text-muted-foreground mt-0.5">
                    {fmtDate(selectedJob.started_at)}
                    {selectedJob.finished_at && ` → ${fmtDate(selectedJob.finished_at)}`}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {selectedJob.metrics && (
                    <div className="flex gap-4 text-right">
                      {selectedJob.metrics.leads_found != null && (
                        <div>
                          <p className="text-[18px] font-semibold tabular-nums leading-none">
                            {selectedJob.metrics.leads_found}
                          </p>
                          <p className="text-[11px] text-muted-foreground">found</p>
                        </div>
                      )}
                      {selectedJob.metrics.leads_qualified != null && (
                        <div>
                          <p className="text-[18px] font-semibold tabular-nums leading-none">
                            {selectedJob.metrics.leads_qualified}
                          </p>
                          <p className="text-[11px] text-muted-foreground">qualified</p>
                        </div>
                      )}
                      {selectedJob.metrics.avg_score != null && (
                        <div>
                          <p className="text-[18px] font-semibold tabular-nums leading-none">
                            {selectedJob.metrics.avg_score.toFixed(1)}
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
                        setCloneIcp(icpToPayload(selectedJob.icp));
                        setShowLaunch(true);
                      }}
                    >
                      <Copy className="h-3 w-3 mr-1" />
                      Reuse params
                    </Button>
                  )}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-red-600 hover:border-red-200"
                        onClick={() => void handleDeleteJob()}
                        disabled={deletingJob}
                      >
                        {deletingJob ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Trash2 className="h-3 w-3" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="text-[11px]">
                      Delete run
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>

            {/* Body */}
            {isLive ? (
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
              <div className="flex-1 flex flex-col overflow-hidden">
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
                    <RunCompaniesTable
                      companies={companies}
                      jobId={selectedJobId!}
                      onCompanyDelete={handleCompanyDelete}
                    />
                  ) : (
                    <RunLeadsTable
                      leads={leads}
                      jobId={selectedJobId!}
                      onLeadUpdate={handleLeadUpdate}
                      onLeadDelete={handleLeadDelete}
                      onAddToList={(ids) => setAddToListIds(ids)}
                    />
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <LaunchDialog
        open={showLaunch}
        onClose={() => {
          setShowLaunch(false);
          setCloneIcp(undefined);
        }}
        onLaunched={handleLaunched}
        initialValues={cloneIcp}
      />

      <AddToListDialog
        open={addToListIds.length > 0}
        leadIds={addToListIds}
        onClose={() => setAddToListIds([])}
      />
    </div>
  );
}
