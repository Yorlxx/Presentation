"use client";

import { useEffect, useState } from "react";
import {
  Activity,
  Clock,
  Eye,
  EyeOff,
  ShieldCheck,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUserId, logAdminActivity } from "@/lib/admin";
import { isValidLoginInput, displayUsername } from "@/lib/username";
import ConfirmModal from "./ConfirmModal";
import type { AdminActivity } from "@/lib/types";

const ACTION_BADGE: Record<string, string> = {
  LOGIN: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  CREATE_ADMIN: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  REMOVE_ADMIN: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  DELETE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  UPDATE: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  APPROVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  BULK_APPROVE: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  BULK_DELETE: "bg-rose-500/10 text-rose-400 border-rose-500/20",
};

const ACTION_DOT: Record<string, string> = {
  LOGIN: "bg-emerald-400",
  CREATE_ADMIN: "bg-blue-400",
  REMOVE_ADMIN: "bg-rose-400",
  DELETE: "bg-rose-400",
  UPDATE: "bg-amber-400",
  APPROVE: "bg-emerald-400",
  BULK_APPROVE: "bg-emerald-400",
  BULK_DELETE: "bg-rose-400",
};

function parseDetails(raw: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as unknown;
    if (typeof o === "object" && o !== null) return o as Record<string, string>;
    return {};
  } catch {
    return { text: raw };
  }
}

/** "12 Oct, 02:02 PM" */
export function formatLogDate(iso: string): string {
  const d = new Date(iso);
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  const day = String(d.getDate()).padStart(2, "0");
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${day} ${months[d.getMonth()]}, ${String(h).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")} ${ampm}`;
}

function humanText(l: AdminActivity): string {
  const d = parseDetails(l.details);
  const who =
    displayUsername(d.username ?? d.email ?? d.nombre ?? "") ||
    displayUsername(l.admin_email) ||
    "—";
  switch (l.action) {
    case "LOGIN":
      return `Inició sesión el usuario ${who}`;
    case "CREATE_ADMIN":
      return `Creó al administrador ${who}${d.role ? ` como ${d.role}` : ""}`;
    case "REMOVE_ADMIN":
      return `Revocó al administrador ${who}`;
    case "DELETE":
      return `Eliminó la ficha de ${displayUsername(d.nombre) || who}`;
    case "UPDATE":
      return `Actualizó la ficha de ${displayUsername(d.nombre) || who}`;
    case "APPROVE":
      return `Aprobó la ficha de ${displayUsername(d.nombre) || who}`;
    case "BULK_APPROVE":
      return d.count ? `Aprobó ${d.count} fichas en lote` : "Aprobó fichas en lote";
    case "BULK_DELETE":
      return d.count ? `Eliminó ${d.count} fichas en lote` : "Eliminó fichas en lote";
    default:
      return d.text || l.action;
  }
}

export function SuperAdminStats({ refreshKey = 0 }: { refreshKey?: number }) {
  const [stats, setStats] = useState({ admins: 0, fichas: 0, eventosHoy: 0 });
  const [loading, setLoading] = useState(true);

  // Se recalcula al montar y cada vez que el padre bumpée refreshKey
  useEffect(() => {
    (async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const [admins, fichas, eventos] = await Promise.all([
        supabase.from("user_roles").select("user_id", { count: "exact", head: true }),
        supabase.from("presentaciones").select("id", { count: "exact", head: true }),
        supabase
          .from("admin_activity")
          .select("id", { count: "exact", head: true })
          .gte("created_at", start.toISOString()),
      ]);
      setStats({
        admins: admins.count ?? 0,
        fichas: fichas.count ?? 0,
        eventosHoy: eventos.count ?? 0,
      });
      setLoading(false);
    })();
  }, [refreshKey]);

  const cards = [
    { label: "Administradores Activos", value: stats.admins, icon: ShieldCheck },
    { label: "Fichas Registradas", value: stats.fichas, icon: Users },
    { label: "Eventos de Auditoría (hoy)", value: stats.eventosHoy, icon: Activity },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
      {cards.map(({ label, value, icon: Icon }) => (
        <div
          key={label}
          className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15">
            <Icon className="h-5 w-5 text-emerald-400" aria-hidden />
          </span>
          <div>
            <p className="text-2xl font-extrabold leading-none">
              {loading ? "…" : value}
            </p>
            <p className="mt-1 text-xs text-zinc-400">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminLogs() {
  const [logs, setLogs] = useState<AdminActivity[]>([]);

  useEffect(() => {
    // En dev, StrictMode monta→desmonta→remonta: sin este guardián, la
    // primera carga (async) se suscribe DESPUÉS del unmount y crea un
    // segundo canal con el mismo nombre ya suscrito → el error de la captura.
    let active = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function fetchLogs() {
      const { data } = await supabase
        .from("admin_activity")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (active && data) setLogs(data as AdminActivity[]);
    }

    (async () => {
      await fetchLogs();
      if (!active) return;

      // Tiempo real
      channel = supabase
        .channel("admin_activity_rt")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "admin_activity" },
          (payload) => {
            if (!active) return;
            setLogs((prev) => [payload.new as AdminActivity, ...prev].slice(0, 100));
          }
        )
        .subscribe();
    })();

    // Respaldo por polling cada 30s por si la replicación no está activa
    const interval = setInterval(fetchLogs, 30000);

    return () => {
      active = false;
      clearInterval(interval);
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-3 flex items-center gap-2 font-bold">
        <Activity className="h-4 w-4 text-zinc-400" aria-hidden />
        Actividad reciente ({logs.length})
      </h3>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1 text-xs">
        {logs.map((l) => (
          <div key={l.id} className="relative pl-5">
            <span
              className={`absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full ${
                ACTION_DOT[l.action] ?? "bg-zinc-500"
              }`}
              aria-hidden
            />
            <div className="rounded-xl bg-zinc-950 p-3">
              <span
                className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-bold ${
                  ACTION_BADGE[l.action] ??
                  "bg-zinc-500/10 text-zinc-400 border-zinc-500/20"
                }`}
              >
                {l.action}
              </span>
              <p className="mt-1.5 text-sm text-zinc-200">{humanText(l)}</p>
              <p className="mt-1 flex items-center gap-1 text-zinc-500">
                <Clock className="h-3 w-3" aria-hidden />
                {formatLogDate(l.created_at)}
              </p>
            </div>
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
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [role, setRole] = useState<"admin" | "super_admin">("admin");
  const [msg, setMsg] = useState("");
  const [msgOk, setMsgOk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [admins, setAdmins] = useState<{ user_id: string; email: string; role: string }[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingRevoke, setPendingRevoke] = useState<{ user_id: string; email: string } | null>(null);
  const [revoking, setRevoking] = useState(false);

  async function load() {
    const { data } = await supabase.from("user_roles").select("*");
    setAdmins((data ?? []) as typeof admins);
  }

  useEffect(() => {
    load();
    // ID de la sesión activa para protección anti auto-eliminación
    getCurrentUserId().then(setCurrentUserId);
  }, []);

  async function addAdmin(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setMsgOk(false);
    const cleanEmail = email.trim().toLowerCase();
    // Acepta usuario simple ("admin1") o correo; el endpoint normaliza a @grupo.local
    if (!isValidLoginInput(email)) {
      setMsg("Ingresa un usuario válido (ej. admin1) o un correo válido.");
      return;
    }
    if (password.length < 6) {
      setMsg("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setSaving(true);
    try {
      // Sesión actual para el header de autorización del endpoint
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        setMsg("Sesión expirada. Vuelve a iniciar sesión.");
        return;
      }

      // Crear vía endpoint server-side (sin rate limit, sin tocar la sesión)
      const res = await fetch("/api/admin/create-user", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: cleanEmail, password, role }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error ?? "Error al crear el administrador");
      }

      setMsg(
        "Administrador creado exitosamente. Ya puede iniciar sesión con sus credenciales."
      );
      setMsgOk(true);
      setEmail("");
      setPassword("");
      setShowPw(false);
      setRole("admin");
      await load();
    } catch (err: unknown) {
      setMsg(err instanceof Error ? err.message : "Error al crear el administrador");
    } finally {
      setSaving(false);
    }
  }

  async function requestRevoke(user_id: string, targetEmail: string) {
    // Comprobación preventiva: nadie puede revocarse su propio rol
    const myId = currentUserId ?? (await getCurrentUserId());
    if (myId) setCurrentUserId(myId);
    if (myId && user_id === myId) {
      toast.error("No puedes quitarte tu propio rol de Super Admin");
      return;
    }
    setPendingRevoke({ user_id, email: targetEmail });
  }

  async function confirmRevoke() {
    if (!pendingRevoke) return;
    const { user_id, email: targetEmail } = pendingRevoke;
    setRevoking(true);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", user_id);
    setRevoking(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logAdminActivity("REMOVE_ADMIN", { email: targetEmail });
    setPendingRevoke(null);
    toast.success("Rol de administrador revocado");
    await load();
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4">
      <h3 className="mb-2 flex items-center gap-2 font-bold">
        <ShieldCheck className="h-4 w-4 text-amber-400" aria-hidden />
        Gestionar administradores
      </h3>
      <form onSubmit={addAdmin} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-xs font-semibold text-zinc-400">
          Email / Usuario
          <input
            type="text"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="admin1 o usuario@grupo.com"
            autoComplete="off"
            className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
          />
        </label>
        <label className="block text-xs font-semibold text-zinc-400">
          Contraseña (mín. 6 caracteres)
          <span className="relative mt-1 block">
            <input
              type={showPw ? "text" : "password"}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className="min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 pr-11 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-emerald-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Ocultar contraseña" : "Mostrar contraseña"}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-zinc-500 hover:text-white"
            >
              {showPw ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <label className="block text-xs font-semibold text-zinc-400">
            Rol
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as typeof role)}
              className="mt-1 min-h-[44px] w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 focus:border-emerald-500 focus:outline-none sm:w-auto"
            >
              <option value="admin">admin</option>
              <option value="super_admin">super_admin</option>
            </select>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="flex min-h-[44px] items-center justify-center gap-1.5 self-end rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" aria-hidden />
            {saving ? "Creando…" : "Agregar Administrador"}
          </button>
        </div>
      </form>
      {msg && (
        <p
          className={`mt-2 rounded-xl border p-2.5 text-xs ${
            msgOk
              ? "border-emerald-800 bg-emerald-950 text-emerald-200"
              : "border-red-900 bg-red-950 text-red-300"
          }`}
        >
          {msg}
        </p>
      )}
      <ul className="mt-3 space-y-2 text-sm">
        {admins.map((a) => {
          const isSelf = currentUserId !== null && a.user_id === currentUserId;
          return (
            <li
              key={a.user_id}
              className="flex items-center justify-between rounded-lg bg-zinc-950 p-2.5"
            >
              <span title={a.email}>
                {displayUsername(a.email)}{" "}
                <span className="text-xs text-emerald-400">({a.role})</span>
                {isSelf && (
                  <span className="ml-2 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400">
                    (Tu cuenta)
                  </span>
                )}
              </span>
              {!isSelf && (
                <button
                  onClick={() => requestRevoke(a.user_id, a.email)}
                  className="rounded-lg bg-red-900 px-2.5 py-1 text-xs"
                >
                  Quitar
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <ConfirmModal
        open={pendingRevoke !== null}
        title="Quitar administrador"
        message={
          pendingRevoke
            ? `¿Quitar el rol de administrador a ${displayUsername(pendingRevoke.email)}? Ya no podrá acceder al panel.`
            : ""
        }
        confirmLabel="Quitar"
        tone="danger"
        busy={revoking}
        onCancel={() => {
          if (!revoking) setPendingRevoke(null);
        }}
        onConfirm={confirmRevoke}
      />
    </div>
  );
}
