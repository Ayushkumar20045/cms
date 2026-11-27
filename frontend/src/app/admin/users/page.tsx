"use client";

import { FormEvent, useEffect, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Dialog, Field, Message, Pager, Panel, filterClass, inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";
import { ApiError } from "@/lib/api/client";
import { admin } from "@/lib/api/endpoints";
import type { AdminUser, UserInput, UserStatus } from "@/lib/api/types";
import { formatDate, timeAgo } from "@/lib/format";
import { useLoad, useSession } from "@/lib/session";

const roleLabel = (r: string) => r.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const PRIVILEGED = ["ADMIN", "SUPER_ADMIN"];
const HOSTEL_ROLES = ["STUDENT", "WARDEN", "CARETAKER"];
const DEPARTMENT_ROLES = ["TECHNICIAN", "SUPERVISOR", "DEPARTMENT_HEAD"];

type Editing = { mode: "create" } | { mode: "edit"; user: AdminUser } | { mode: "password"; user: AdminUser };

function UserForm({
  editing,
  roles,
  canGrantAdmin,
  selfId,
  onClose,
  onSaved,
}: {
  editing: Editing;
  roles: string[];
  canGrantAdmin: boolean;
  selfId: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}) {
  const existing = editing.mode === "create" ? null : editing.user;
  const hostels = useLoad(() => admin.hostels(), []);
  const departments = useLoad(() => admin.departments(), []);
  const [form, setForm] = useState({
    loginId: "",
    password: "",
    firstName: existing?.firstName ?? "",
    lastName: existing?.lastName ?? "",
    email: existing?.email ?? "",
    phone: existing?.phone ?? "",
    roles: existing?.roles ?? [],
    hostelId: existing?.hostel?.id ? String(existing.hostel.id) : "",
    roomNumber: existing?.roomNumber ?? "",
    block: existing?.block ?? "",
    departmentId: existing?.department?.id ? String(existing.department.id) : "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string | string[]) => setForm((f) => ({ ...f, [key]: value }));
  const needsHostel = form.roles.some((r) => HOSTEL_ROLES.includes(r));
  const needsDepartment = form.roles.some((r) => DEPARTMENT_ROLES.includes(r));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const body: UserInput = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      roles: form.roles,
      hostelId: needsHostel && form.hostelId ? Number(form.hostelId) : null,
      roomNumber: form.roles.includes("STUDENT") ? form.roomNumber.trim() || null : null,
      block: form.roles.includes("STUDENT") ? form.block.trim() || null : null,
      departmentId: needsDepartment && form.departmentId ? Number(form.departmentId) : null,
    };
    try {
      if (existing) {
        // Roles are only sent when they changed, and never for your own account (the server refuses that)
        const same = [...existing.roles].sort().join() === [...form.roles].sort().join();
        if (same || existing.id === selfId) delete body.roles;
        await admin.updateUser(existing.id, body);
      } else {
        await admin.createUser({ ...body, loginId: form.loginId.trim(), password: form.password });
      }
      onSaved();
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(Object.fromEntries(e.errors.filter((x) => x.field).map((x) => [x.field as string, x.message])));
        setMessage(e.errors.length ? "Please correct the highlighted fields." : e.message);
      } else {
        setMessage("Something went wrong. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title={existing ? `Edit ${existing.fullName}` : "Add user"} subtitle={existing?.loginId} onClose={onClose} wide>
      <form onSubmit={submit}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {!existing && (
            <>
              <Field label="Login ID" htmlFor="loginId" error={errors.loginId} hint="University login ID, staff ID or admin ID">
                <input id="loginId" required className={inputClass} value={form.loginId} onChange={(e) => set("loginId", e.target.value)} />
              </Field>
              <Field label="Initial password" htmlFor="password" error={errors.password} hint="At least 10 characters">
                <input id="password" type="password" required minLength={10} autoComplete="new-password" className={inputClass} value={form.password} onChange={(e) => set("password", e.target.value)} />
              </Field>
            </>
          )}
          <Field label="First name" htmlFor="firstName" error={errors.firstName}>
            <input id="firstName" required className={inputClass} value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </Field>
          <Field label="Last name" htmlFor="lastName" error={errors.lastName}>
            <input id="lastName" className={inputClass} value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
          <Field label="Email" htmlFor="email" error={errors.email}>
            <input id="email" type="email" className={inputClass} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </Field>
          <Field label="Phone" htmlFor="phone" error={errors.phone}>
            <input id="phone" className={inputClass} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>

          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-xs font-semibold text-slate-700">Roles</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {roles.map((r) => {
                const locked = (PRIVILEGED.includes(r) && !canGrantAdmin) || existing?.id === selfId;
                return (
                  <label key={r} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs ${locked ? "border-slate-100 text-slate-400" : "border-slate-200 text-slate-700"}`}>
                    <input
                      type="checkbox"
                      disabled={locked}
                      checked={form.roles.includes(r)}
                      onChange={(e) => set("roles", e.target.checked ? [...form.roles, r] : form.roles.filter((x) => x !== r))}
                    />
                    {roleLabel(r)}
                  </label>
                );
              })}
            </div>
            {errors.roles && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.roles}</p>}
            {!canGrantAdmin && <p className="mt-1 text-[11px] text-slate-400">Only a Super Admin can grant administrator roles.</p>}
          </fieldset>

          {needsHostel && (
            <Field label="Hostel" htmlFor="hostelId" error={errors.hostelId}>
              <select id="hostelId" className={inputClass} value={form.hostelId} onChange={(e) => set("hostelId", e.target.value)}>
                <option value="">No hostel</option>
                {(hostels.data ?? []).map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {form.roles.includes("STUDENT") && (
            <div className="grid grid-cols-2 gap-4">
              <Field label="Block" htmlFor="block">
                <input id="block" className={inputClass} value={form.block} onChange={(e) => set("block", e.target.value)} />
              </Field>
              <Field label="Room" htmlFor="roomNumber">
                <input id="roomNumber" className={inputClass} value={form.roomNumber} onChange={(e) => set("roomNumber", e.target.value)} />
              </Field>
            </div>
          )}
          {needsDepartment && (
            <Field label="Department" htmlFor="departmentId" error={errors.departmentId}>
              <select id="departmentId" className={inputClass} value={form.departmentId} onChange={(e) => set("departmentId", e.target.value)}>
                <option value="">Choose a department</option>
                {(departments.data ?? []).map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </div>

        {message && (
          <p role="alert" className="mx-5 mb-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {message}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={primaryButton} disabled={busy || !form.roles.length}>
            {busy ? "Saving…" : existing ? "Save changes" : "Create user"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

function PasswordForm({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await admin.resetPassword(user.id, password);
      onSaved();
    } catch (e) {
      setError(e instanceof ApiError ? (e.errors[0]?.message ?? e.message) : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog title="Reset password" subtitle={`${user.fullName} · ${user.loginId}`} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="space-y-3 p-5">
          <Field label="New password" htmlFor="new-password" hint="At least 10 characters. The user is signed out everywhere." error={error ?? undefined}>
            <input id="new-password" type="password" required minLength={10} autoComplete="new-password" className={inputClass} value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-200 p-5">
          <button type="button" className={secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className={primaryButton} disabled={busy || password.length < 10}>
            {busy ? "Saving…" : "Reset password"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AdminUsersPage() {
  const { user, signOut } = useSession("admin");
  const ready = Boolean(user);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState<UserStatus | "">("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [notice, setNotice] = useState<{ error: boolean; text: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const roles = useLoad(() => (ready ? admin.roles() : Promise.resolve(null)), [ready]);
  const list = useLoad(() => (ready ? admin.users({ search: query, role, status, page, limit: 20 }) : Promise.resolve(null)), [ready, query, role, status, page]);
  const rows = list.data?.data ?? [];
  const canGrantAdmin = Boolean(user?.permissions.includes("ROLE_UPDATE"));

  async function toggleActive(u: AdminUser) {
    setNotice(null);
    try {
      await admin.setUserActive(u.id, u.status !== "ACTIVE");
      setNotice({ error: false, text: `${u.fullName} ${u.status === "ACTIVE" ? "deactivated" : "activated"}` });
      list.reload();
    } catch (e) {
      setNotice({ error: true, text: e instanceof ApiError ? e.message : "Something went wrong. Please try again." });
    }
  }

  return (
    <AdminShell title="Users" section="Users" user={user} onSignOut={signOut}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Users</h2>
          <p className="mt-1 text-sm text-slate-500">Accounts for students, staff and administrators, with their roles and hostel or department.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setEditing({ mode: "create" })}>
          + Add user
        </button>
      </div>

      {notice && (
        <p role={notice.error ? "alert" : "status"} className={`mb-4 rounded-lg px-3 py-2 text-xs font-medium ${notice.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
          {notice.text}
        </p>
      )}

      <Panel
        title="All users"
        subtitle={`${list.data?.pagination.total ?? 0} account${list.data?.pagination.total === 1 ? "" : "s"}`}
        actions={
          <>
            <label htmlFor="search" className="sr-only">
              Search users
            </label>
            <input id="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, login ID or email…" className={`${filterClass} w-full sm:w-[250px]`} />
            <label htmlFor="role" className="sr-only">
              Role
            </label>
            <select id="role" className={filterClass} value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }}>
              <option value="">All Roles</option>
              {(roles.data ?? []).map((r) => (
                <option key={r} value={r}>
                  {roleLabel(r)}
                </option>
              ))}
            </select>
            <label htmlFor="status" className="sr-only">
              Status
            </label>
            <select id="status" className={filterClass} value={status} onChange={(e) => { setStatus(e.target.value as UserStatus | ""); setPage(1); }}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </>
        }
      >
        {list.error ? (
          <Message error>{list.error}</Message>
        ) : list.loading ? (
          <Message>Loading users…</Message>
        ) : rows.length === 0 ? (
          <Message>No users match these filters.</Message>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px]">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-left text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  <th className="px-5 py-3">User</th>
                  <th className="px-4 py-3">Roles</th>
                  <th className="px-4 py-3">Hostel / Department</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last sign-in</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id} className="border-b border-slate-100 last:border-0">
                    <td className="px-5 py-4">
                      <p className="text-sm font-semibold text-slate-800">{u.fullName}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {u.loginId}
                        {u.email ? ` · ${u.email}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {u.roles.map((r) => (
                          <span key={r} className="rounded-full bg-[#f8e9ef] px-2 py-0.5 text-[10px] font-bold text-[#8e123f]">
                            {roleLabel(r)}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-600">
                      {u.hostel?.name ?? u.department?.name ?? "—"}
                      {u.roomNumber ? <span className="block text-[11px] text-slate-400">Room {u.roomNumber}</span> : null}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${u.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                        {u.status === "ACTIVE" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-xs text-slate-500" title={u.lastLoginAt ? formatDate(u.lastLoginAt) : undefined}>
                      {u.lastLoginAt ? timeAgo(u.lastLoginAt) : "Never"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#a5174d] hover:text-[#8e123f]" onClick={() => setEditing({ mode: "edit", user: u })}>
                          Edit
                        </button>
                        <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#a5174d] hover:text-[#8e123f]" onClick={() => setEditing({ mode: "password", user: u })}>
                          Reset password
                        </button>
                        {u.id !== user?.id && (
                          <button type="button" className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 hover:border-[#a5174d] hover:text-[#8e123f]" onClick={() => toggleActive(u)}>
                            {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pager page={page} totalPages={list.data?.pagination.totalPages ?? 1} onPage={setPage} />
      </Panel>

      {editing?.mode === "password" && (
        <PasswordForm
          user={editing.user}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice({ error: false, text: `Password reset for ${editing.user.fullName}` });
            setEditing(null);
          }}
        />
      )}
      {editing && editing.mode !== "password" && (
        <UserForm
          editing={editing}
          roles={roles.data ?? []}
          canGrantAdmin={canGrantAdmin}
          selfId={user?.id}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setNotice({ error: false, text: editing.mode === "create" ? "User created" : "User updated" });
            setEditing(null);
            list.reload();
          }}
        />
      )}
    </AdminShell>
  );
}
