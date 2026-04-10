import useAuth from "@/modules/auth/hooks/useAuth";
import { Outlet } from "react-router";
import { LoginForm } from "../components/LoginForm";

export function AuthLayout() {
  const { user, isInitializing, loadingLogin } = useAuth();

  return isInitializing || (loadingLogin && !user) ? (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm">Signing you in...</p>
      </div>
    </div>
  ) : user ? (
    <Outlet />
  ) : (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
