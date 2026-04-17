import { apiClient } from "@/lib/api-client";
import { mapTsRestErrorsToFormErrors } from "@/lib/form-utils";
import { toast } from "@/lib/toast";
import { FormError } from "@/modules/common/components/FormError";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  contactListSchema,
  createEmailCampaignRequestSchema,
  emailCampaignWithStatsSchema,
  generateEmailRequestSchema,
  emailToneEnum,
} from "@repo/api-contract";
import { Button } from "@repo/ui/components/ui/button";
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
import { Tabs, TabsList, TabsTrigger } from "@repo/ui/components/ui/tabs";
import { Textarea } from "@repo/ui/components/ui/textarea";
import {
  Bot,
  Calendar,
  Code2,
  Loader2,
  MessageSquarePlus,
  PencilLine,
  Send,
  Sparkles,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type z from "zod";

type ContactListRecord = z.infer<typeof contactListSchema>;
type EmailCampaignRecord = z.infer<typeof emailCampaignWithStatsSchema>;
type CampaignFormData = z.infer<typeof createEmailCampaignRequestSchema>;
type GenerateFormData = z.infer<typeof generateEmailRequestSchema>;

type EditorMode = "ai" | "manual";
type AiStep = "form" | "preview";

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: EmailCampaignRecord | null;
  onSaved: () => void;
}

const MAX_HTML_SIZE = 102400; // 100KB

const TONE_LABELS: Record<z.infer<typeof emailToneEnum>, string> = {
  professional: "Professional",
  friendly: "Friendly",
  casual: "Casual",
  urgent: "Urgent",
  formal: "Formal",
};

// ─── AI Generation Form ───────────────────────────────────────────────────────

interface AiFormProps {
  onGenerated: (html: string, subject: string) => void;
  activeOrgId: string | null;
}

function AiGenerationForm({ onGenerated, activeOrgId }: AiFormProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GenerateFormData>({
    resolver: zodResolver(generateEmailRequestSchema),
    defaultValues: {
      tone: "professional",
      purpose: "",
      targetAudience: "",
      keyMessage: "",
      companyName: "",
      additionalNotes: "",
    },
  });

  const headers = activeOrgId
    ? { "x-active-organization-id": activeOrgId }
    : {};

  const onSubmit = async (data: GenerateFormData) => {
    try {
      setIsGenerating(true);
      const response = await apiClient.emailCampaignContract.generateEmailContent({
        body: data,
        extraHeaders: activeOrgId ? headers : undefined,
      });

      if (response.status === 200) {
        onGenerated(response.body.htmlContent, response.body.subject);
      } else {
        toast.error("Failed to generate email. Please try again.");
      }
    } catch {
      toast.error("Failed to generate email. Please check your connection.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
        <Bot className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <p className="text-sm text-muted-foreground leading-relaxed">
          Fill in the form below and our AI will generate a complete,
          ready-to-send email for you. You can then preview it and fine-tune via
          prompt or switch to manual editing.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Company / Brand name <span className="text-destructive">*</span>
          </label>
          <Input
            placeholder="e.g. Acme Corp"
            {...register("companyName")}
          />
          <FormError message={errors.companyName?.message} />
        </div>

        <div className="grid gap-2">
          <label className="text-sm font-medium">
            Tone <span className="text-destructive">*</span>
          </label>
          <Controller
            name="tone"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tone" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TONE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FormError message={errors.tone?.message} />
        </div>
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Email purpose <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="e.g. Announce our summer sale with 30% off all products"
          {...register("purpose")}
        />
        <FormError message={errors.purpose?.message} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Target audience <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="e.g. Existing customers who purchased in the last 6 months"
          {...register("targetAudience")}
        />
        <FormError message={errors.targetAudience?.message} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Key message / Call to action <span className="text-destructive">*</span>
        </label>
        <Input
          placeholder="e.g. Shop now and save 30% — offer ends Sunday"
          {...register("keyMessage")}
        />
        <FormError message={errors.keyMessage?.message} />
      </div>

      <div className="grid gap-2">
        <label className="text-sm font-medium">
          Additional notes{" "}
          <span className="text-xs text-muted-foreground">(optional)</span>
        </label>
        <Textarea
          placeholder="e.g. Mention free shipping on orders over $50, include a discount code SUMMER30"
          rows={3}
          {...register("additionalNotes")}
        />
        <FormError message={errors.additionalNotes?.message} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={isGenerating} className="gap-2">
          {isGenerating ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" />
              Generate email
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

// ─── AI Preview & Refine ─────────────────────────────────────────────────────

interface AiPreviewProps {
  htmlContent: string;
  onEditManually: () => void;
  onRegenerate: (html: string, subject: string) => void;
  onUse: (html: string) => void;
  activeOrgId: string | null;
}

function AiPreview({
  htmlContent,
  onEditManually,
  onRegenerate,
  onUse,
  activeOrgId,
}: AiPreviewProps) {
  const [prompt, setPrompt] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [currentHtml, setCurrentHtml] = useState(htmlContent);

  const headers = activeOrgId
    ? { "x-active-organization-id": activeOrgId }
    : {};

  const handleRefine = async () => {
    if (!prompt.trim()) return;
    try {
      setIsRefining(true);
      // We send the prompt as an "additional notes" instruction along with minimal required fields
      const response = await apiClient.emailCampaignContract.generateEmailContent({
        body: {
          purpose: `Refine the existing email with the following instructions: ${prompt}`,
          targetAudience: "same as before",
          keyMessage: "same as before",
          tone: "professional",
          companyName: "same as before",
          additionalNotes: `Previous HTML content for reference:\n${currentHtml.slice(0, 2000)}`,
        },
        extraHeaders: activeOrgId ? headers : undefined,
      });

      if (response.status === 200) {
        setCurrentHtml(response.body.htmlContent);
        onRegenerate(response.body.htmlContent, response.body.subject);
        setPrompt("");
        toast.success("Email updated");
      } else {
        toast.error("Failed to refine email. Please try again.");
      }
    } catch {
      toast.error("Failed to refine email.");
    } finally {
      setIsRefining(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Here is your AI-generated email. Use the options below to refine it or
          switch to manual editing.
        </p>
      </div>

      {/* Preview */}
      <div
        className="rounded-md border border-input bg-white overflow-hidden"
        style={{ height: "380px" }}
      >
        <iframe
          title="AI email preview"
          srcDoc={currentHtml}
          className="w-full h-full border-0"
          sandbox="allow-same-origin"
        />
      </div>

      {/* Refine via prompt */}
      <div className="rounded-lg border border-input p-4 space-y-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageSquarePlus className="h-4 w-4 text-primary" />
          Edit via prompt
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="e.g. Make the tone more casual and add urgency to the CTA"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleRefine();
              }
            }}
          />
          <Button
            type="button"
            variant="outline"
            disabled={isRefining || !prompt.trim()}
            onClick={() => void handleRefine()}
            className="shrink-0 gap-2"
          >
            {isRefining ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Apply
          </Button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onEditManually}
          className="gap-2"
        >
          <Code2 className="h-4 w-4" />
          Edit manually (HTML)
        </Button>
        <Button
          type="button"
          onClick={() => onUse(currentHtml)}
          className="gap-2"
        >
          <PencilLine className="h-4 w-4" />
          Use this email
        </Button>
      </div>
    </div>
  );
}

// ─── Main Dialog ──────────────────────────────────────────────────────────────

export function CampaignFormDialog({
  open,
  onOpenChange,
  campaign,
  onSaved,
}: CampaignFormDialogProps) {
  const { activeOrgId } = useActiveOrg();
  const [contactLists, setContactLists] = useState<ContactListRecord[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [htmlPreview, setHtmlPreview] = useState("");

  // AI state
  const [editorMode, setEditorMode] = useState<EditorMode>("ai");
  const [aiStep, setAiStep] = useState<AiStep>("form");
  const [aiGeneratedHtml, setAiGeneratedHtml] = useState("");
  const [aiGeneratedSubject, setAiGeneratedSubject] = useState("");

  const previewTimeout = useRef<ReturnType<typeof setTimeout>>();

  const headers = activeOrgId
    ? { "x-active-organization-id": activeOrgId }
    : {};

  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    setError,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(createEmailCampaignRequestSchema),
    defaultValues: {
      name: "",
      subject: "",
      htmlContent: "",
      contactListId: "",
    },
  });

  const htmlContent = watch("htmlContent");
  const htmlSize = new TextEncoder().encode(htmlContent || "").length;

  // Debounced HTML preview update (manual mode only)
  useEffect(() => {
    if (editorMode !== "manual") return;
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => {
      setHtmlPreview(htmlContent || "");
    }, 300);
    return () => {
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
    };
  }, [htmlContent, editorMode]);

  const fetchContactLists = useCallback(async () => {
    try {
      const response = await apiClient.contactListContract.listContactLists({
        extraHeaders: activeOrgId ? headers : undefined,
      });
      if (response.status === 200) {
        setContactLists(response.body.lists);
      }
    } catch (error) {
      console.error(error);
    }
  }, [activeOrgId]);

  useEffect(() => {
    if (open) {
      void fetchContactLists();
      if (campaign) {
        // Editing an existing campaign — always go to manual mode
        setEditorMode("manual");
        setAiStep("form");
        reset({
          name: campaign.name,
          subject: campaign.subject,
          htmlContent: campaign.htmlContent,
          contactListId: campaign.contactListId,
        });
        if (campaign.scheduledAt) {
          setScheduleEnabled(true);
          setScheduledAt(
            new Date(campaign.scheduledAt).toISOString().slice(0, 16),
          );
        } else {
          setScheduleEnabled(false);
          setScheduledAt("");
        }
      } else {
        setEditorMode("ai");
        setAiStep("form");
        setAiGeneratedHtml("");
        setAiGeneratedSubject("");
        reset({
          name: "",
          subject: "",
          htmlContent: "",
          contactListId: "",
        });
        setScheduleEnabled(false);
        setScheduledAt("");
      }
    }
  }, [open, campaign, reset, fetchContactLists]);

  // Called when AI finishes generating
  const handleAiGenerated = (html: string, subject: string) => {
    setAiGeneratedHtml(html);
    setAiGeneratedSubject(subject);
    setAiStep("preview");
  };

  // Called when the user accepts the AI email and wants to continue to the save form
  const handleUseAiEmail = (html: string) => {
    setValue("htmlContent", html);
    if (!watch("subject")) {
      setValue("subject", aiGeneratedSubject);
    }
    setEditorMode("manual");
  };

  // Called when the user wants to edit the AI-generated HTML manually
  const handleEditManually = () => {
    setValue("htmlContent", aiGeneratedHtml);
    if (!watch("subject")) {
      setValue("subject", aiGeneratedSubject);
    }
    setEditorMode("manual");
  };

  const onSubmit = async (data: CampaignFormData) => {
    try {
      setIsSaving(true);

      if (campaign) {
        const response =
          await apiClient.emailCampaignContract.updateEmailCampaign({
            params: { id: campaign.id },
            body: data,
            extraHeaders: activeOrgId ? headers : undefined,
          });

        if (response.status === 200) {
          if (scheduleEnabled && scheduledAt) {
            await apiClient.emailCampaignContract.scheduleEmailCampaign({
              params: { id: campaign.id },
              body: { scheduledAt: new Date(scheduledAt) },
              extraHeaders: activeOrgId ? headers : undefined,
            });
          }
          toast.success("Campaign updated");
          onSaved();
          return;
        }

        if (response.status === 400) {
          mapTsRestErrorsToFormErrors(response.body, setError);
          return;
        }

        toast.error("Failed to update campaign");
        return;
      }

      const response =
        await apiClient.emailCampaignContract.createEmailCampaign({
          body: data,
          extraHeaders: activeOrgId ? headers : undefined,
        });

      if (response.status === 201) {
        if (scheduleEnabled && scheduledAt) {
          await apiClient.emailCampaignContract.scheduleEmailCampaign({
            params: { id: response.body.id },
            body: { scheduledAt: new Date(scheduledAt) },
            extraHeaders: activeOrgId ? headers : undefined,
          });
        }
        toast.success("Campaign created");
        onSaved();
        return;
      }

      if (response.status === 400) {
        mapTsRestErrorsToFormErrors(response.body, setError);
        return;
      }

      toast.error("Failed to create campaign");
    } catch (error) {
      console.error(error);
      toast.error("Failed to save campaign");
    } finally {
      setIsSaving(false);
    }
  };

  const isNewCampaign = !campaign;
  // Show AI mode selector only for new campaigns
  const showModeToggle = isNewCampaign;
  // Show the save form fields (name, subject, list, HTML editor) in manual mode or when editing
  const showSaveForm = editorMode === "manual" || !!campaign;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[92vw] max-h-[95dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {campaign ? "Edit Campaign" : "New Email Campaign"}
          </DialogTitle>
          <DialogDescription>
            {campaign
              ? "Update your email campaign details and content."
              : "Create a new email campaign to send to your contact lists."}
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle — only for new campaigns */}
        {showModeToggle && (
          <Tabs
            value={editorMode}
            onValueChange={(v) => {
              setEditorMode(v as EditorMode);
              if (v === "ai") {
                setAiStep("form");
              }
            }}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="ai" className="gap-2">
                <Bot className="h-4 w-4" />
                AI-powered
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Code2 className="h-4 w-4" />
                Manual (HTML)
              </TabsTrigger>
            </TabsList>
          </Tabs>
        )}

        {/* ── AI flow ── */}
        {editorMode === "ai" && isNewCampaign && (
          <div className="space-y-4">
            {aiStep === "form" && (
              <AiGenerationForm
                onGenerated={handleAiGenerated}
                activeOrgId={activeOrgId}
              />
            )}
            {aiStep === "preview" && (
              <AiPreview
                htmlContent={aiGeneratedHtml}
                activeOrgId={activeOrgId}
                onEditManually={handleEditManually}
                onRegenerate={(html, subject) => {
                  setAiGeneratedHtml(html);
                  setAiGeneratedSubject(subject);
                }}
                onUse={handleUseAiEmail}
              />
            )}
          </div>
        )}

        {/* ── Manual / save form ── */}
        {showSaveForm && (
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Campaign name
                </label>
                <Input
                  id="name"
                  placeholder="e.g. March Newsletter"
                  {...register("name")}
                />
                <FormError message={errors.name?.message} />
              </div>

              <div className="grid gap-2">
                <label htmlFor="contactListId" className="text-sm font-medium">
                  Contact list
                </label>
                <Controller
                  name="contactListId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a contact list" />
                      </SelectTrigger>
                      <SelectContent>
                        {contactLists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list._count?.entries ?? 0} contacts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FormError message={errors.contactListId?.message} />
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="subject" className="text-sm font-medium">
                Subject line
              </label>
              <Input
                id="subject"
                placeholder="e.g. Don't miss our latest updates!"
                {...register("subject")}
              />
              <FormError message={errors.subject?.message} />
            </div>

            <div
              className="grid gap-4 lg:grid-cols-2"
              style={{ minHeight: "460px" }}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="htmlContent" className="text-sm font-medium">
                    HTML content
                  </label>
                  <span
                    className={`text-xs ${htmlSize > MAX_HTML_SIZE ? "text-destructive font-medium" : "text-muted-foreground"}`}
                  >
                    {(htmlSize / 1024).toFixed(1)} KB
                    {htmlSize > MAX_HTML_SIZE && " — content is very large"}
                  </span>
                </div>
                <textarea
                  id="htmlContent"
                  className="flex-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm font-mono ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
                  style={{ minHeight: "440px" }}
                  placeholder="<html><body><h1>Hello!</h1></body></html>"
                  {...register("htmlContent")}
                />
                <FormError message={errors.htmlContent?.message} />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium">Live preview</label>
                <div
                  className="flex-1 rounded-md border border-input bg-white overflow-hidden"
                  style={{ minHeight: "440px" }}
                >
                  {htmlPreview ? (
                    <iframe
                      title="Email preview"
                      srcDoc={htmlPreview}
                      className="w-full h-full border-0"
                      style={{ minHeight: "440px" }}
                      sandbox="allow-same-origin"
                    />
                  ) : (
                    <div
                      className="flex items-center justify-center text-sm text-muted-foreground"
                      style={{ minHeight: "440px" }}
                    >
                      Start typing HTML to see a live preview
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-md border border-input p-3">
              <input
                type="checkbox"
                id="scheduleToggle"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300"
              />
              <label
                htmlFor="scheduleToggle"
                className="text-sm font-medium flex items-center gap-2"
              >
                <Calendar className="h-4 w-4" />
                Schedule for later
              </label>
              {scheduleEnabled && (
                <Input
                  type="datetime-local"
                  value={scheduledAt}
                  onChange={(e) => setScheduledAt(e.target.value)}
                  className="ml-auto w-auto"
                  min={new Date().toISOString().slice(0, 16)}
                />
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              {!campaign && !scheduleEnabled && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaving}
                  onClick={handleSubmit(async (data) => {
                    try {
                      setIsSaving(true);
                      const response =
                        await apiClient.emailCampaignContract.createEmailCampaign(
                          {
                            body: data,
                            extraHeaders: activeOrgId ? headers : undefined,
                          },
                        );

                      if (response.status === 201) {
                        const sendResponse =
                          await apiClient.emailCampaignContract.sendEmailCampaign(
                            {
                              params: { id: response.body.id },
                              body: undefined,
                              extraHeaders: activeOrgId ? headers : undefined,
                            },
                          );

                        if (sendResponse.status === 200) {
                          toast.success(sendResponse.body.message);
                        } else {
                          toast.error(sendResponse.body.message);
                        }
                        onSaved();
                      } else if (response.status === 400) {
                        mapTsRestErrorsToFormErrors(response.body, setError);
                      }
                    } catch (error) {
                      console.error(error);
                      toast.error("Failed to send campaign");
                    } finally {
                      setIsSaving(false);
                    }
                  })}
                >
                  <Send className="mr-2 h-4 w-4" />
                  Save & Send Now
                </Button>
              )}
              <Button type="submit" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : scheduleEnabled
                    ? "Save & Schedule"
                    : "Save Draft"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
