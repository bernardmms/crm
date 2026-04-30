import { apiClient } from "@/lib/api-client";
import { toast } from "@/lib/toast";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import {
  emailCampaignWithStatsSchema,
  generateEmailRequestSchema,
  emailToneEnum,
} from "@repo/api-contract";
import { Button } from "@repo/ui/components/ui/button";
import { Input } from "@repo/ui/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { Textarea } from "@repo/ui/components/ui/textarea";
import {
  Bot,
  Code2,
  Download,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormError } from "@/modules/common/components/FormError";
import type z from "zod";
import type { SendEmailConfig } from "../nodes/SendEmailNode";

type GenerateFormData = z.infer<typeof generateEmailRequestSchema>;
type EmailCampaign = z.infer<typeof emailCampaignWithStatsSchema>;

const TONE_LABELS: Record<z.infer<typeof emailToneEnum>, string> = {
  professional: "Professional",
  friendly: "Friendly",
  casual: "Casual",
  urgent: "Urgent",
  formal: "Formal",
};

interface Props {
  config: SendEmailConfig;
  onChange: (config: SendEmailConfig) => void;
}

type EditorMode = "ai" | "manual";

export function SendEmailConfigPanel({ config, onChange }: Props) {
  const { activeOrgId } = useActiveOrgId();
  const [mode, setMode] = useState<EditorMode>("manual");
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiHtml, setAiHtml] = useState("");
  const [htmlPreview, setHtmlPreview] = useState(config.htmlContent ?? "");
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
  const [showImport, setShowImport] = useState(false);
  const previewTimeout = useRef<ReturnType<typeof setTimeout>>();

  const headers = activeOrgId ? { "x-active-organization-id": activeOrgId } : {};

  const { register, handleSubmit, control, formState: { errors } } = useForm<GenerateFormData>({
    resolver: zodResolver(generateEmailRequestSchema),
    defaultValues: { tone: "professional", purpose: "", targetAudience: "", keyMessage: "", companyName: "" },
  });

  useEffect(() => {
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => {
      setHtmlPreview(config.htmlContent ?? "");
    }, 300);
    return () => { if (previewTimeout.current) clearTimeout(previewTimeout.current); };
  }, [config.htmlContent]);

  useEffect(() => {
    void apiClient.emailCampaignContract
      .listEmailCampaigns({ extraHeaders: activeOrgId ? headers : undefined })
      .then((r) => { if (r.status === 200) setCampaigns(r.body.campaigns); });
  }, [activeOrgId]);

  function handleImport(campaign: EmailCampaign) {
    onChange({
      ...config,
      name: config.name || campaign.name,
      subject: campaign.subject,
      htmlContent: campaign.htmlContent,
    });
    setShowImport(false);
    toast.success(`Imported from "${campaign.name}"`);
  }

  async function onAiGenerate(data: GenerateFormData) {
    setIsGenerating(true);
    try {
      const r = await apiClient.emailCampaignContract.generateEmailContent({
        body: data,
        extraHeaders: activeOrgId ? headers : undefined,
      });
      if (r.status === 200) {
        setAiHtml(r.body.htmlContent);
        onChange({ ...config, subject: config.subject || r.body.subject, htmlContent: r.body.htmlContent });
        setMode("manual");
        toast.success("Email generated");
      } else {
        toast.error("Failed to generate email");
      }
    } catch {
      toast.error("Failed to generate email");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Import from campaign */}
      <div>
        <Button
          size="sm"
          variant="outline"
          className="gap-2 w-full"
          onClick={() => setShowImport((v) => !v)}
        >
          <Download className="h-3.5 w-3.5" />
          Import from existing campaign
        </Button>
        {showImport && (
          <div className="mt-2 rounded-md border border-input max-h-40 overflow-y-auto">
            {campaigns.length === 0 ? (
              <p className="p-3 text-xs text-muted-foreground">No campaigns found</p>
            ) : (
              campaigns.map((c) => (
                <button
                  key={c.id}
                  className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                  onClick={() => handleImport(c)}
                >
                  <span className="font-medium">{c.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{c.subject}</span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Mode toggle */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as EditorMode)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual" className="gap-2">
            <Code2 className="h-3.5 w-3.5" />
            Manual
          </TabsTrigger>
          <TabsTrigger value="ai" className="gap-2">
            <Bot className="h-3.5 w-3.5" />
            AI generate
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Manual fields */}
      {mode === "manual" && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Step name</label>
            <Input
              placeholder="e.g. Welcome email"
              value={config.name ?? ""}
              onChange={(e) => onChange({ ...config, name: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Subject</label>
            <Input
              placeholder="e.g. Welcome to our platform!"
              value={config.subject ?? ""}
              onChange={(e) => onChange({ ...config, subject: e.target.value })}
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-sm font-medium">HTML content</label>
            </div>
            <Textarea
              className="font-mono text-xs"
              rows={8}
              placeholder="<html><body>...</body></html>"
              value={config.htmlContent ?? ""}
              onChange={(e) => onChange({ ...config, htmlContent: e.target.value })}
            />
          </div>
          {htmlPreview && (
            <div className="rounded-md border border-input overflow-hidden" style={{ height: 200 }}>
              <iframe
                title="preview"
                srcDoc={htmlPreview}
                className="w-full h-full border-0"
                sandbox="allow-same-origin"
              />
            </div>
          )}
        </div>
      )}

      {/* AI generation form */}
      {mode === "ai" && (
        <form onSubmit={handleSubmit(onAiGenerate)} className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Company / Brand</label>
            <Input placeholder="Acme Corp" {...register("companyName")} />
            <FormError message={errors.companyName?.message} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Tone</label>
            <Controller
              name="tone"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TONE_LABELS).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Purpose</label>
            <Input placeholder="Announce our summer sale…" {...register("purpose")} />
            <FormError message={errors.purpose?.message} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Target audience</label>
            <Input placeholder="Existing customers…" {...register("targetAudience")} />
            <FormError message={errors.targetAudience?.message} />
          </div>
          <div className="space-y-1">
            <label className="text-sm font-medium">Key message / CTA</label>
            <Input placeholder="Shop now…" {...register("keyMessage")} />
            <FormError message={errors.keyMessage?.message} />
          </div>
          <Button type="submit" disabled={isGenerating} className="w-full gap-2">
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            Generate & use
          </Button>
        </form>
      )}
    </div>
  );
}

function useActiveOrgId() {
  return useActiveOrg();
}
