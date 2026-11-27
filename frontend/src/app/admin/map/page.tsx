"use client";

import { AdminShell } from "@/components/admin/admin-shell";
import { CampusMap } from "@/components/map/campus-map";
import { useSession } from "@/lib/session";

export default function AdminMapPage() {
  const { user, signOut } = useSession("admin");
  return (
    <AdminShell title="Campus Map" section="Campus Map" user={user} onSignOut={signOut}>
      <CampusMap />
    </AdminShell>
  );
}
