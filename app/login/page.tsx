"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { logAdminActivity } from "@/lib/admin";
import { isValidLoginInput, toAuthEmail } from "@/lib/username";

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
      if (!isValidLoginInput(email)) {
        throw new Error("Ingresa tu usuario o un correo válido.");
      }
      // Normalización transparente: "admin1" -> "admin1@grupo.local"
      const loginEmail = toAuthEmail(email);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });
      if (error) throw error;

      // Verificar rol (maybeSingle: distingue "sin fila" de error RLS/red)
      const { data: role, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (roleError) throw new Error(`Error leyendo rol: ${roleError.message}`);
      if (!role) {
        await supabase.auth.signOut();
        throw new Error("Este usuario no tiene rol de administrador.");
      }

      // Auditoría silenciosa (sin alertas en pantalla)
      await logAdminActivity("LOGIN", { email: loginEmail });

      router.push(role.role === "super_admin" ? "/super-admin" : "/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm py-10">
      <h1 className="flex items-center gap-2 text-2xl font-extrabold">
        <LockKeyhole className="h-6 w-6 text-zinc-400" aria-hidden />
        Acceso admin
      </h1>
      <p className="mb-5 text-sm text-zinc-400">
        Solo personal autorizado del grupo. Puedes entrar con tu usuario o tu
        correo.
      </p>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="text"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Usuario o correo (ej. admin1)"
          autoComplete="username"
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
