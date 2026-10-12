"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { logAdminActivity } from "@/lib/admin";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      // Verificar rol
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .single();

      if (!role) {
        await supabase.auth.signOut();
        throw new Error("Este usuario no tiene rol de administrador.");
      }

      // Auditoría silenciosa (sin alertas en pantalla)
      await logAdminActivity("LOGIN", { email });

      router.push(role.role === "super_admin" ? "/super-admin" : "/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="text-2xl font-extrabold">🔐 Acceso admin</h1>
      <p className="mb-5 text-sm text-zinc-400">
        Solo personal autorizado del grupo.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="admin@grupo.com"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm focus:border-emerald-500 focus:outline-none"
        />
        {error && (
          <p className="rounded-xl border border-red-900 bg-red-950 p-3 text-sm text-red-300">
            {error}
          </p>
        )}
        <button
          disabled={loading}
          className="w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}
