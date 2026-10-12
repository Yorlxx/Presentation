"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";

export type SessionRole = "admin" | "super_admin" | null;

type SessionState = {
  userId: string | null;
  email: string;
  role: SessionRole;
  /** true solo durante la verificación inicial al cargar la app */
  loading: boolean;
  /** Re-lee sesión + rol bajo demanda (p. ej. tras login) */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionState>({
  userId: null,
  email: "",
  role: null,
  loading: true,
  refresh: async () => {},
});

export function useSession(): SessionState {
  return useContext(SessionContext);
}

async function fetchRole(userId: string): Promise<SessionRole> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.error("[SessionProvider] error leyendo user_roles:", error.message);
    return null;
  }
  if (!data || (data.role !== "admin" && data.role !== "super_admin")) return null;
  return data.role;
}

async function loadUser(
  user: User | null,
  set: (s: Omit<SessionState, "refresh">) => void
) {
  if (!user) {
    set({ userId: null, email: "", role: null, loading: false });
    return;
  }
  const role = await fetchRole(user.id);
  set({ userId: user.id, email: user.email ?? "", role, loading: false });
}

/**
 * Obtiene sesión + rol UNA sola vez al cargar la app y los mantiene
 * en memoria vía onAuthStateChange. Las rutas leen useSession()
 * sin nuevas llamadas a la base de datos al cambiar de vista.
 */
export default function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<Omit<SessionState, "refresh">>({
    userId: null,
    email: "",
    role: null,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;
    const set = (s: Omit<SessionState, "refresh">) => {
      if (mounted) setState(s);
    };
    (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      await loadUser(session?.user ?? null, set);
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // INITIAL_SESSION la cubre el getSession() inicial: evita doble fetch
        if (event === "INITIAL_SESSION") return;
        await loadUser(session?.user ?? null, set);
      }
    );
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<SessionState>(
    () => ({
      ...state,
      refresh: async () => {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        await loadUser(session?.user ?? null, setState);
      },
    }),
    [state]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
