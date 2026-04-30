import { toast } from "@/lib/toast";
import { apiClient } from "@/lib/api-client";
import { useActiveOrg } from "@/modules/organizations/hooks/useActiveOrg";
import { FormError } from "@/modules/common/components/FormError";
import { Button } from "@repo/ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/ui/dialog";
import { Input } from "@repo/ui/components/ui/input";
import { Label } from "@repo/ui/components/ui/label";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";

type FormData = { name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateFlowDialog({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const { activeOrgId } = useActiveOrg();
  const [isSaving, setIsSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ defaultValues: { name: "" } });

  useEffect(() => {
    if (open) reset({ name: "" });
  }, [open, reset]);

  const onSubmit = async ({ name }: FormData) => {
    const headers = activeOrgId ? { "x-active-organization-id": activeOrgId } : {};
    setIsSaving(true);
    try {
      const r = await apiClient.flowContract.createFlow({
        body: { name: name.trim() },
        extraHeaders: activeOrgId ? headers : undefined,
      });
      if (r.status === 201) {
        toast.success("Flow created");
        onOpenChange(false);
        void navigate(`/flows/${r.body.id}/edit`);
      } else {
        toast.error("Failed to create flow");
      }
    } catch {
      toast.error("Failed to create flow");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        <DialogHeader className="border-b bg-gradient-to-br from-muted/60 via-muted/20 to-background px-6 py-5">
          <DialogTitle className="text-xl">New Flow</DialogTitle>
        </DialogHeader>

        <form className="flex flex-col" onSubmit={handleSubmit(onSubmit)}>
          <div className="px-6 py-5">
            <div className="grid gap-2">
              <Label htmlFor="flow-name">
                Flow name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="flow-name"
                placeholder="e.g. Welcome sequence"
                autoFocus
                {...register("name", { required: "Flow name is required" })}
              />
              <FormError message={errors.name?.message} />
            </div>
          </div>

          <DialogFooter className="border-t bg-background px-6 py-4 sm:justify-between">
            <p className="text-xs text-muted-foreground">
              You can rename this flow later.
            </p>
            <div className="flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-10"
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving} className="h-10">
                {isSaving ? "Creating…" : "Create Flow"}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
