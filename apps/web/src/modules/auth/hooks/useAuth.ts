import { apiClient } from "@/lib/api-client";
import type { AuthSession, AuthUser } from "@/modules/auth/types";
import { authSignInEmailRequestSchema } from "@repo/api-contract";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useBetween } from "use-between";
import type z from "zod";

function _useAuth() {
  const [user, setUser] = useState<AuthUser>();
  const [session, setSession] = useState<AuthSession>();
  const [isInitializing, setIsInitializing] = useState(true);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loadingLogout, setLoadingLogout] = useState(false);

  const login = useCallback(
    async (props: z.infer<typeof authSignInEmailRequestSchema>) => {
      try {
        setLoadingLogin(true);
        const response = await apiClient.authContract.signInEmail({
          body: props,
        });

        if (response.status === 200) {
          setUser(response.body.user);
        } else {
          setUser(undefined);
        }
        return response;
      } catch (error) {
        console.error(error);
        setUser(undefined);
        throw error;
      } finally {
        setLoadingLogin(false);
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      setLoadingLogout(true);
      await apiClient.authContract.signOut({
        body: undefined,
      });
    } catch (error) {
      console.error(error);
    } finally {
      setUser(undefined);
      setLoadingLogout(false);
    }
  }, []);

  async function fetchCurrentUser() {
    try {
      setSession(undefined);
      const response = await apiClient.authContract.getSession();
      if (response.status === 200 && response.body) {
        setSession(response.body.session);
        setUser(response.body.user);
        return;
      }
      setUser(undefined);
    } catch (error) {
      console.error(error);
      setUser(undefined);
    } finally {
      setIsInitializing(false);
    }
  }
  useEffect(() => {
    fetchCurrentUser();
  }, []);

  return useMemo(
    () => ({
      user,
      isInitializing,
      login,
      logout,
      loadingLogin,
      loadingLogout,
      session,
    }),
    [user, isInitializing, login, logout, loadingLogin, loadingLogout, session],
  );
}

const useAuth = () => useBetween(_useAuth);

export default useAuth;
