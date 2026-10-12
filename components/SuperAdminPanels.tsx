"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { logAdminActivity } from "@/lib/admin";
import type { AdminActivity } from "@/lib/types";

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminActivity[]>([]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    (async () => {
      const { data } = await supabase
        .from("admin_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      setLogs((data ?? []) as AdminActivity[]);

      // Tiempo real
      channel = supabase
        .channel("admin_activity_rt")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_activity" },
          (payload) => {
            setLogs((prev) => [payload.new as AdminActivity, ...prev].slice(0, 100));
          }
        )
        .subscribe();
    })();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-2 font-bold">📜 Logs en tiempo real ({logs.length})</h3>
      <div className="max-h-96 space-y-2 overflow-y-auto text-xs">
        {logs.map((l) => (
          <div key={l.id} className="rounded-lg bg-zinc-950 p-2.5">
            <p>
              <span className="font-bold text-emerald-400">{l.action}</span>{" "}
              <span className="text-zinc-400">{l.admin_email}</span>
            </p>
            <p className="truncate text-zinc-500">{l.details}</p>
            <p className="text-zinc-600">
              {new Date(l.created_at).toLocaleString()}
            </p>
          </div>
        ))}
        {logs.length === 0 && (
          <p className="text-zinc-500">Sin actividad registrada.</p>
        )}
      </div>
    </div>
  );
}

export function ManageAdmins() {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [msg, setMsg] = useState("");
  const [admins, setAdmins] = useState<{ user_id: string; email: string; role: string }[]>([]);

  async function load() {
    const { data } = await supabase.from("user_roles").select("*");
    setAdmins((data ?? []) as typeof admins);
  }

  useEffect(() => {
    load();
  }, []);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    try {
      // 1. Crear/invitar usuario Auth (si ya existe, falla y se asigna rol por email vía RPC o manual).
      // Nota: signUp no inicia sesión al usuario actual; requiere confirmación según config.
      const { data, error } = await supabase.auth.signUp({
        email,
        password: Math.random().toString(36).slice(2) + "Aa1!",
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (userId) {
        const { error: rErr } = await supabase
          .from("user_roles")
          .upsert({ user_id: userId, email, role });
        if (rErr) throw rErr;
      } else {
        setMsg(
          "Usuario invitado. Si el email ya existía, asigna el rol manualmente en Supabase (user_roles) con su user_id."
        );
        return;
      }
      await logAdminActivity("CREATE_ADMIN", { email, role });
      setMsg(`✅ ${email} agregado como ${role}`);
      setEmail("");
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Error");
    }
  }

  async function removeAdmin(user_id: string, targetEmail: string) {
    if (!confirm(`¿Quitar rol admin a ${targetEmail}?`)) return;
    const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id);
    if (!error) {
      await logAdminActivity("REMOVE_ADMIN", { email: targetEmail });
      await load();
    }
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-2 font-bold">👑 Gestionar administradores</h3>
      <form onSubmit={addAdmin} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nuevo@grupo.com"
          className="flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm"
        >
          <option value="admin">admin</option>
          <option value="super_admin">super_admin</option>
        </select>
        <button className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-zinc-950">
          Agregar
        </button>
      </form>
      {msg && <p className="mt-2 text-xs text-zinc-300">{msg}</p>}
      <ul className="mt-3 space-y-2 text-sm">
        {admins.map((a) => (
          <li
            key={a.user_id}
            className="flex items-center justify-between rounded-lg bg-zinc-950 p-2.5"
          >
            <span>
              {a.email} <span className="text-xs text-emerald-400">({a.role})</span>
            </span>
            <button
              onClick={() => removeAdmin(a.user_id, a.email)}
              className="rounded-lg bg-red-900 px-2.5 py-1 text-xs"
            >
              Quitar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
