"use client";

import { FormEvent, useState } from "react";

import { AdminShell } from "@/components/admin/admin-shell";
import { Dialog, Field, Message, StatCard, inputClass, primaryButton, secondaryButton } from "@/components/admin/ui";
import { ApiError } from "@/lib/api/client";
import { admin } from "@/lib/api/endpoints";
import type { AdminHostel } from "@/lib/api/types";
import { useLoad, useSession } from "@/lib/session";

function HostelForm({ hostel, onClose, onSaved }: { hostel: AdminHostel | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    code: hostel?.code ?? "",
    name: hostel?.name ?? "",
    capacity: hostel?.capacity != null ? String(hostel.capacity) : "",
    contactPhone: hostel?.contactPhone ?? "",
    contactEmail: hostel?.contactEmail ?? "",
    isActive: hostel?.isActive ?? true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form, value: string | boolean) => setForm((f) => ({ ...f, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setErrors({});
    setMessage(null);
    const common = {
      name: form.name.trim(),
      capacity: form.capacity ? Number(form.capacity) : null,
      contactPhone: form.contactPhone.trim() || null,
      contactEmail: form.contactEmail.trim() || null,
    };
    try {
      if (hostel) await admin.updateHostel(hostel.id, { ...common, isActive: form.isActive });
      else await admin.createHostel({ ...common, code: form.code.trim() });
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
    <Dialog title={hostel ? `Edit ${hostel.name}` : "Add hostel"} subtitle={hostel?.code} onClose={onClose}>
      <form onSubmit={submit}>
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {!hostel && (
            <Field label="Code" htmlFor="code" error={errors.code} hint="Short unique code, e.g. GBH">
              <input id="code" required pattern="[A-Za-z0-9_\-]+" className={inputClass} value={form.code} onChange={(e) => set("code", e.target.value)} />
            </Field>
          )}
          <Field label="Name" htmlFor="name" error={errors.name}>
            <input id="name" required className={inputClass} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </Field>
          <Field label="Capacity" htmlFor="capacity" error={errors.capacity} hint="Number of residents">
            <input id="capacity" type="number" min={0} className={inputClass} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} />
          </Field>
          <Field label="Contact phone" htmlFor="contactPhone" error={errors.contactPhone}>
            <input id="contactPhone" className={inputClass} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
          </Field>
          <Field label="Contact email" htmlFor="contactEmail" error={errors.contactEmail}>
            <input id="contactEmail" type="email" className={inputClass} value={form.contactEmail} onChange={(e) => set("contactEmail", e.target.value)} />
          </Field>
          {hostel && (
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Hostel is active
            </label>
          )}
          {!hostel && <p className="text-[11px] text-slate-400 sm:col-span-2">Its building is added to the campus locations automatically.</p>}
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
          <button type="submit" className={primaryButton} disabled={busy}>
            {busy ? "Saving…" : hostel ? "Save changes" : "Create hostel"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}

export default function AdminHostelsPage() {
  const { user, signOut } = useSession("admin");
  const ready = Boolean(user);
  const hostels = useLoad(() => (ready ? admin.hostels() : Promise.resolve(null)), [ready]);
  const [editing, setEditing] = useState<AdminHostel | "new" | null>(null);
  const rows = hostels.data ?? [];
  const totals = rows.reduce(
    (t, h) => ({ students: t.students + h.studentCount, open: t.open + h.openComplaints, capacity: t.capacity + (h.capacity ?? 0) }),
    { students: 0, open: 0, capacity: 0 },
  );

  return (
    <AdminShell title="Hostels" section="Hostels" user={user} onSignOut={signOut}>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Hostels</h2>
          <p className="mt-1 text-sm text-slate-500">Hostels, their residents, wardens and open complaints.</p>
        </div>
        <button type="button" className={primaryButton} onClick={() => setEditing("new")}>
          + Add hostel
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard title="Hostels" value={hostels.data ? rows.length : "–"} subtitle={`${rows.filter((h) => h.isActive).length} active`} />
        <StatCard title="Students allocated" value={hostels.data ? totals.students : "–"} subtitle={totals.capacity ? `of ${totals.capacity} places` : "Capacity not set"} />
        <StatCard title="Open complaints" value={hostels.data ? totals.open : "–"} subtitle="Across all hostels" tone="text-[#a5174d]" />
      </div>

      <div className="mt-6">
        {hostels.error ? (
          <Message error>{hostels.error}</Message>
        ) : hostels.loading ? (
          <Message>Loading hostels…</Message>
        ) : rows.length === 0 ? (
          <Message>No hostels yet.</Message>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {rows.map((h) => (
              <article key={h.id} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-bold text-[#a5174d]">{h.code}</p>
                    <h3 className="mt-1 text-base font-bold text-slate-900">{h.name}</h3>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${h.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {h.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
                  {[
                    ["Students", h.studentCount],
                    ["Capacity", h.capacity ?? "—"],
                    ["Open", h.openComplaints],
                  ].map(([name, value]) => (
                    <div key={name as string} className="rounded-xl bg-slate-50 px-2 py-3">
                      <dt className="text-[11px] text-slate-500">{name}</dt>
                      <dd className="mt-1 text-lg font-semibold text-slate-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                <div className="mt-4 space-y-1 text-xs text-slate-600">
                  <p>
                    <span className="text-slate-400">Wardens: </span>
                    {h.wardens.length ? h.wardens.map((w) => w.fullName).join(", ") : "None assigned"}
                  </p>
                  <p>
                    <span className="text-slate-400">Contact: </span>
                    {[h.contactPhone, h.contactEmail].filter(Boolean).join(" · ") || "Not set"}
                  </p>
                </div>

                <button type="button" className={`${secondaryButton} mt-4 h-9 w-full text-xs`} onClick={() => setEditing(h)}>
                  Edit
                </button>
              </article>
            ))}
          </div>
        )}
      </div>

      {editing && (
        <HostelForm
          hostel={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            hostels.reload();
          }}
        />
      )}
    </AdminShell>
  );
}
