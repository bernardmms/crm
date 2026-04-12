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
import { Calendar, Send } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import type z from "zod";

type ContactListRecord = z.infer<typeof contactListSchema>;
type EmailCampaignRecord = z.infer<typeof emailCampaignWithStatsSchema>;
type CampaignFormData = z.infer<typeof createEmailCampaignRequestSchema>;

interface CampaignFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaign: EmailCampaignRecord | null;
  onSaved: () => void;
}

const MAX_HTML_SIZE = 102400; // 100KB

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

  // Debounced HTML preview update
  useEffect(() => {
    if (previewTimeout.current) clearTimeout(previewTimeout.current);
    previewTimeout.current = setTimeout(() => {
      setHtmlPreview(htmlContent || "");
    }, 300);
    return () => {
      if (previewTimeout.current) clearTimeout(previewTimeout.current);
    };
  }, [htmlContent]);

  const fetchContactLists = useCallback(async () => {
    try {
      const response =
        await apiClient.contactListContract.listContactLists({
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
          // If scheduling was enabled, schedule it
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

      // Create new campaign
      const response =
        await apiClient.emailCampaignContract.createEmailCampaign({
          body: data,
          extraHeaders: activeOrgId ? headers : undefined,
        });

      if (response.status === 201) {
        // If scheduling was enabled, schedule the new campaign
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

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Campaign name
              </label>
              <Input id="name" placeholder="e.g. March Newsletter" {...register("name")} />
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
                  <Select value={field.value} onValueChange={field.onChange}>
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

          <div className="grid gap-4 lg:grid-cols-2" style={{ minHeight: "460px" }}>
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
            <label htmlFor="scheduleToggle" className="text-sm font-medium flex items-center gap-2">
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
                  // Save as draft then immediately send
                  try {
                    setIsSaving(true);
                    const response =
                      await apiClient.emailCampaignContract.createEmailCampaign({
                        body: data,
                        extraHeaders: activeOrgId ? headers : undefined,
                      });

                    if (response.status === 201) {
                      const sendResponse =
                        await apiClient.emailCampaignContract.sendEmailCampaign({
                          params: { id: response.body.id },
                          body: undefined,
                          extraHeaders: activeOrgId ? headers : undefined,
                        });

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
      </DialogContent>
    </Dialog>
  );
}
