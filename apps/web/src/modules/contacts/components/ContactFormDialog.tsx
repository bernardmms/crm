import { apiClient } from "@/lib/api-client";
import { mapTsRestErrorsToFormErrors } from "@/lib/form-utils";
import { toast } from "@/lib/toast";
import { FormError } from "@/modules/common/components/FormError";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    contactSchema,
    createContactRequestSchema,
    type updateContactRequestSchema,
} from "@repo/api-contract";
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
import { Separator } from "@repo/ui/components/ui/separator";
import { Textarea } from "@repo/ui/components/ui/textarea";
import { BriefcaseBusiness, Building2, Mail, NotebookPen, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import type z from "zod";

type ContactRecord = z.infer<typeof contactSchema>;
type ContactFormData = z.infer<typeof createContactRequestSchema>;
type ContactUpdateData = z.infer<typeof updateContactRequestSchema>;

type ContactFormDialogProps = {
    open: boolean;
    activeOrgId: string | null;
    selectedContact: ContactRecord | null;
    onOpenChange: (open: boolean) => void;
    onSaved: () => Promise<void>;
};

const emptyValues: ContactFormData = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    jobTitle: "",
    notes: "",
};

export function ContactFormDialog({
    open,
    activeOrgId,
    selectedContact,
    onOpenChange,
    onSaved,
}: ContactFormDialogProps) {
    const [isSaving, setIsSaving] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<ContactFormData>({
        resolver: zodResolver(createContactRequestSchema),
        defaultValues: emptyValues,
    });

    useEffect(() => {
        if (!open) {
            return;
        }

        if (!selectedContact) {
            reset(emptyValues);
            return;
        }

        reset({
            firstName: selectedContact.firstName,
            lastName: selectedContact.lastName ?? "",
            email: selectedContact.email ?? "",
            phone: selectedContact.phone ?? "",
            company: selectedContact.company ?? "",
            jobTitle: selectedContact.jobTitle ?? "",
            notes: selectedContact.notes ?? "",
        });
    }, [open, selectedContact?.id, reset]);

    const onSubmit = async (data: ContactFormData) => {
        try {
            setIsSaving(true);

            if (selectedContact) {
                const response = await apiClient.contactContract.updateContact({
                    params: { id: selectedContact.id },
                    body: buildUpdateContactPayload(data),
                    extraHeaders: activeOrgId
                        ? { "x-active-organization-id": activeOrgId }
                        : undefined,
                });

                if (response.status === 200) {
                    toast.success("Contact updated");
                    onOpenChange(false);
                    await onSaved();
                    return;
                }

                if (response.status === 400) {
                    mapTsRestErrorsToFormErrors(response.body, setError);
                    return;
                }

                toast.error("Failed to update contact");
                return;
            }

            const response = await apiClient.contactContract.createContact({
                body: buildCreateContactPayload(data),
                extraHeaders: activeOrgId
                    ? { "x-active-organization-id": activeOrgId }
                    : undefined,
            });

            if (response.status === 201) {
                toast.success("Contact created");
                onOpenChange(false);
                await onSaved();
                return;
            }

            if (response.status === 400) {
                mapTsRestErrorsToFormErrors(response.body, setError);
                return;
            }

            toast.error("Failed to save contact");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save contact");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="overflow-hidden p-0 sm:max-w-3xl">
                <DialogHeader className="border-b bg-gradient-to-br from-muted/60 via-muted/20 to-background px-6 py-5">
                    <DialogTitle className="text-xl">
                        {selectedContact ? "Edit contact" : "Create contact"}
                    </DialogTitle>
                </DialogHeader>

                <form className="flex max-h-[80vh] flex-col" onSubmit={handleSubmit(onSubmit)}>
                    <div className="space-y-6 overflow-y-auto px-6 py-5">

                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                                    Personal information
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Basic details used for identification and communication.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="firstName">
                                        <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                        First name <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="firstName"
                                        autoComplete="given-name"
                                        className="h-11"
                                        placeholder="e.g. Ana"
                                        {...register("firstName")}
                                    />

                                    <FormError message={errors.firstName?.message} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="lastName">
                                        <User className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                        Last name
                                    </Label>
                                    <Input
                                        id="lastName"
                                        autoComplete="family-name"
                                        className="h-11"
                                        placeholder="e.g. Souza"
                                        {...register("lastName")}
                                    />
                                    <FormError message={errors.lastName?.message} />
                                </div>
                            </div>
                        </section>

                        <Separator />

                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                                    Contact channels
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Add how your team can reach this person.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="email">
                                        <Mail className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                        Email
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        autoComplete="email"
                                        className="h-11"
                                        placeholder="name@company.com"
                                        {...register("email")}
                                    />
                                    <FormError message={errors.email?.message} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone">
                                        <Phone className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                        Phone
                                    </Label>
                                    <Input
                                        id="phone"
                                        inputMode="tel"
                                        autoComplete="tel"
                                        className="h-11"
                                        placeholder="+55 11 99999-9999"
                                        {...register("phone")}
                                    />
                                    <FormError message={errors.phone?.message} />
                                </div>
                            </div>
                        </section>

                        <Separator />

                        <section className="space-y-4">
                            <div className="space-y-1">
                                <h3 className="text-sm font-semibold tracking-wide text-foreground uppercase">
                                    Professional context
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Company and role information help segment and prioritize outreach.
                                </p>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="company">
                                        <Building2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                        Company
                                    </Label>
                                    <Input
                                        id="company"
                                        autoComplete="organization"
                                        className="h-11"
                                        placeholder="e.g. Acme Ltd"
                                        {...register("company")}
                                    />
                                    <FormError message={errors.company?.message} />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="jobTitle">
                                        <BriefcaseBusiness
                                            className="h-4 w-4 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                        Job title
                                    </Label>
                                    <Input
                                        id="jobTitle"
                                        autoComplete="organization-title"
                                        className="h-11"
                                        placeholder="e.g. Product Manager"
                                        {...register("jobTitle")}
                                    />
                                    <FormError message={errors.jobTitle?.message} />
                                </div>
                            </div>
                        </section>

                        <Separator />

                        <section className="space-y-2">
                            <Label htmlFor="notes">
                                <NotebookPen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                Notes
                            </Label>
                            <Textarea
                                id="notes"
                                rows={5}
                                className="min-h-28"
                                placeholder="Context, preferences, and conversation highlights"
                                {...register("notes")}
                            />
                            <p className="text-xs text-muted-foreground">
                                Tip: include relationship context, priorities, or next follow-up.
                            </p>
                            <FormError message={errors.notes?.message} />
                        </section>
                    </div>

                    <DialogFooter className="border-t bg-background px-6 py-4 sm:justify-between min-h-23">
                        <p className="text-xs text-muted-foreground">
                            Changes are saved only after you confirm.
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
                                {isSaving ? "Saving..." : selectedContact ? "Update contact" : "Save contact"}
                            </Button>
                        </div>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

function buildCreateContactPayload(data: ContactFormData): ContactFormData {
    return {
        firstName: data.firstName.trim(),
        lastName: trimOptional(data.lastName),
        email: trimOptional(data.email),
        phone: trimOptional(data.phone),
        company: trimOptional(data.company),
        jobTitle: trimOptional(data.jobTitle),
        notes: trimOptional(data.notes),
    };
}

function buildUpdateContactPayload(data: ContactFormData): ContactUpdateData {
    const payload: ContactUpdateData = {};

    if (data.firstName.trim()) payload.firstName = data.firstName.trim();
    if (trimOptional(data.lastName)) payload.lastName = trimOptional(data.lastName);
    if (trimOptional(data.email)) payload.email = trimOptional(data.email);
    if (trimOptional(data.phone)) payload.phone = trimOptional(data.phone);
    if (trimOptional(data.company)) payload.company = trimOptional(data.company);
    if (trimOptional(data.jobTitle)) payload.jobTitle = trimOptional(data.jobTitle);
    if (trimOptional(data.notes)) payload.notes = trimOptional(data.notes);

    return payload;
}

function trimOptional(value?: string) {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
}
