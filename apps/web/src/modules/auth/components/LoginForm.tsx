import useAuth from "@/modules/auth/hooks/useAuth";
import { Button } from "@repo/ui/components/ui/button.js";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/ui/card.js";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { authSignInEmailRequestSchema } from "@repo/api-contract";
import type z from "zod";
import { FormField } from "@/modules/common/components/FormField";
import { mapTsRestErrorsToFormErrors } from "@/lib/form-utils";
import { toast } from "@/lib/toast";

type LoginFormData = z.infer<typeof authSignInEmailRequestSchema>;

export function LoginForm() {
  const { login, loadingLogin } = useAuth();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(authSignInEmailRequestSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      const result = await login(data);

      if (result.status === 400) {
        mapTsRestErrorsToFormErrors(result.body, setError);
        toast.error("Please check your input and try again");
      } else if (result.status !== 200) {
        toast.error("An error occurred. Please try again.");
      }
    } catch {
      toast.error("An error occurred. Please try again.");
    }
  };

  return (
    <Card className="w-full shadow-none border-0 sm:border sm:shadow-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl">WeCRM</CardTitle>
        <CardDescription>Sign in to your account to continue</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Email"
            type="email"
            placeholder="your@email.com"
            registration={register("email")}
            error={errors.email}
          />
          <FormField
            label="Password"
            type="password"
            placeholder="••••••••"
            registration={register("password")}
            error={errors.password}
          />
          <Button type="submit" disabled={loadingLogin} className="w-full">
            {loadingLogin ? "Logging in..." : "Login"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
