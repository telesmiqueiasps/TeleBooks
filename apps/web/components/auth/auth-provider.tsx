"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { User, Session, AuthChangeEvent } from "@supabase/supabase-js";
import type { Profile } from "@telebooks/types";
import { createClient } from "../../lib/supabase/client";

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (
    email: string,
    password: string,
    username: string,
    fullName?: string
  ) => Promise<{ error?: string; requiresEmailConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  updatePassword: (password: string) => Promise<{ error?: string }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error?: string }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = useMemo(() => createClient(), []);

  const fetchProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch {
      // Falha silenciosa se offline ou tabela inacessível
    }
  }, [supabase]);

  const refreshProfile = useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id);
    }
  }, [user?.id, fetchProfile]);

  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        const {
          data: { session: initialSession },
        } = await supabase.auth.getSession();

        if (!isMounted) return;

        setSession(initialSession);
        setUser(initialSession?.user ?? null);

        if (initialSession?.user) {
          await fetchProfile(initialSession.user.id);
        }
      } catch (err) {
        console.error("Erro ao inicializar sessão:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, newSession: Session | null) => {
      if (!isMounted) return;

      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === "SIGNED_IN" && newSession?.user) {
        await fetchProfile(newSession.user.id);
      } else if (event === "SIGNED_OUT") {
        setProfile(null);
      } else if (event === "USER_UPDATED" && newSession?.user) {
        await fetchProfile(newSession.user.id);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const mapErrorMessage = (error: any): string => {
    if (!error) return "Ocorreu um erro inesperado.";
    const msg = error.message?.toLowerCase() || "";

    if (msg.includes("invalid login credentials") || msg.includes("invalid_credentials")) {
      return "E-mail ou senha incorretos. Por favor, tente novamente.";
    }
    if (msg.includes("email already in use") || msg.includes("already registered")) {
      return "Este endereço de e-mail já está cadastrado. Tente fazer login.";
    }
    if (
      msg.includes("profiles_username_key") ||
      msg.includes("duplicate key value violates unique constraint") ||
      (msg.includes("database error") && msg.includes("username"))
    ) {
      return "Este nome de usuário (@username) já está em uso por outro leitor. Por favor, escolha outro.";
    }
    if (msg.includes("weak_password") || msg.includes("password should be at least")) {
      return "A senha deve ter no mínimo 6 caracteres.";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return "Muitas tentativas em pouco tempo. Aguarde alguns minutos.";
    }
    if (msg.includes("network") || msg.includes("fetch failed")) {
      return "Erro de conexão com o servidor. Verifique sua conexão de internet.";
    }
    return error.message || "Não foi possível concluir a solicitação.";
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: mapErrorMessage(error) };
      }

      if (data.user) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id);
      }

      return {};
    } catch (err: any) {
      return { error: mapErrorMessage(err) };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    username: string,
    fullName?: string
  ) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.trim().toLowerCase(),
            full_name: fullName?.trim() || null,
          },
        },
      });

      if (error) {
        return { error: mapErrorMessage(error) };
      }

      // Se exigir confirmação de e-mail pelo Supabase
      const requiresEmailConfirmation =
        data.user && (!data.session || data.user.identities?.length === 0);

      if (data.user && data.session) {
        setUser(data.user);
        setSession(data.session);
        await fetchProfile(data.user.id);
      }

      return { requiresEmailConfirmation: !!requiresEmailConfirmation };
    } catch (err: any) {
      return { error: mapErrorMessage(err) };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } catch (err) {
      console.error("Erro ao encerrar sessão:", err);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/redefinir-senha`,
      });

      if (error) {
        return { error: mapErrorMessage(error) };
      }

      return {};
    } catch (err: any) {
      return { error: mapErrorMessage(err) };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        return { error: mapErrorMessage(error) };
      }

      return {};
    } catch (err: any) {
      return { error: mapErrorMessage(err) };
    }
  };

  const updateProfile = async (data: Partial<Profile>) => {
    if (!user?.id) return { error: "Usuário não autenticado." };

    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) {
        return { error: mapErrorMessage(error) };
      }

      await refreshProfile();
      return {};
    } catch (err: any) {
      return { error: mapErrorMessage(err) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        session,
        isLoading,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        updateProfile,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser utilizado dentro de um AuthProvider");
  }
  return context;
}
