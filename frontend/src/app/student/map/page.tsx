import { MapPage } from "@/components/map/map-page";

export default function StudentMapPage() {
  return (
    <MapPage
      area="student"
      portalLabel="Student Portal"
      roleLabel="Student"
      backHref="/student/dashboard"
      reportHref="/student/complaints/new"
    />
  );
}
