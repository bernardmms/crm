import { toast } from "@/lib/toast";
import { FormField } from "@/modules/common/components/FormField";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@repo/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/ui/card";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { authClient } from "@/lib/auth-client";

const schema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
});

type FormData = z.infer<typeof schema>;

export function NewOrganizationPage() {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    const result = await authClient.organization.create({
      name: data.name,
      slug: slugify(data.name),
    });

    if (result.error || !result.data) {
      toast.error(result.error?.message ?? "Failed to create organization");
      return;
    }

    await authClient.organization.setActive({
      organizationId: result.data.id,
    });
    toast.success(`Organization "${data.name}" created`);
    navigate("/");
  };

  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 items-center px-4 py-8">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Create organization</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              label="Organization name"
              type="text"
              registration={register("name")}
              error={errors.name}
            />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create organization"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
