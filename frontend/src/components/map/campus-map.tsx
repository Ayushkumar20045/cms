"use client";

import Link from "next/link";
import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import { StatusBadge } from "@/components/student/status-badge";
import { locations } from "@/lib/api/endpoints";
import type { BuildingType, CampusMap as CampusMapData, MapGeometry } from "@/lib/api/types";
import { formatDate } from "@/lib/format";
import { useLoad } from "@/lib/session";

/**
 * The private GBU campus map. It draws only the shapes imported from the university's own GIS file
 * (no Google or OpenStreetMap tiles), so nothing outside the campus is shown or requested from a third party.
 */

const TYPE_STYLE: Record<BuildingType, { label: string; stroke: string; fill: string }> = {
  ACADEMIC: { label: "Academic", stroke: "#1d4ed8", fill: "#dbeafe" },
  HOSTEL: { label: "Hostel", stroke: "#a5174d", fill: "#f8e9ef" },
  ADMINISTRATIVE: { label: "Administrative", stroke: "#334155", fill: "#e2e8f0" },
  LIBRARY: { label: "Library", stroke: "#b45309", fill: "#fef3c7" },
  SPORTS: { label: "Sports", stroke: "#15803d", fill: "#dcfce7" },
  MEDICAL: { label: "Medical", stroke: "#be123c", fill: "#ffe4e6" },
  RESIDENTIAL: { label: "Residential", stroke: "#6d28d9", fill: "#ede9fe" },
  UTILITY: { label: "Utility", stroke: "#0f766e", fill: "#ccfbf1" },
  OTHER: { label: "Other", stroke: "#64748b", fill: "#f1f5f9" },
};

const WIDTH = 1000;
const MIN_ZOOM = 1;
const MAX_ZOOM = 12;

type Projector = (point: number[]) => [number, number];

function makeProjector(bounds: [number, number, number, number]) {
  const [minLng, minLat, maxLng, maxLat] = bounds;
  // Equirectangular projection scaled by cos(latitude): accurate enough at campus scale
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const scale = WIDTH / Math.max((maxLng - minLng) * k, 1e-9);
  const height = (maxLat - minLat) * scale;
  const project: Projector = ([lng, lat]) => [(lng - minLng) * k * scale, (maxLat - lat) * scale];
  return { project, height };
}

function polygons(geometry: MapGeometry): number[][][][] {
  return geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
}

function toPath(geometry: MapGeometry, project: Projector): string {
  return polygons(geometry)
    .flatMap((poly) =>
      poly.map(
        (ring) =>
          ring
            .map((point, i) => {
              const [x, y] = project(point);
              return `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
            })
            .join("") + "Z",
      ),
    )
    .join("");
}

function centre(geometry: MapGeometry, project: Projector): [number, number] {
  const ring = polygons(geometry)[0][0].slice(0, -1);
  const points = ring.map(project);
  return [
    points.reduce((sum, p) => sum + p[0], 0) / points.length,
    points.reduce((sum, p) => sum + p[1], 0) / points.length,
  ];
}

export function CampusMap({
  reportHref,
}: {
  /** When set, the building panel offers "Report a problem here", linking to this path with ?buildingId= */
  reportHref?: string;
}) {
  const map = useLoad(() => locations.map(), []);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const summary = useLoad(
    () => (selectedId ? locations.mapBuilding(selectedId) : Promise.resolve(null)),
    [selectedId],
  );

  if (map.loading) {
    return <p className="py-16 text-center text-sm text-slate-400">Loading the campus map…</p>;
  }
  if (map.error || !map.data) {
    return (
      <p role="alert" className="py-16 text-center text-sm text-red-600">
        {map.error ?? "The campus map could not be loaded."}
      </p>
    );
  }
  if (!map.data.bounds) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-700">The campus map has not been imported yet.</p>
        <p className="mt-1 text-xs text-slate-500">An administrator can import it from the GBU campus GeoJSON file.</p>
      </div>
    );
  }

  const data = map.data;
  const selected = data.buildings.find((b) => b.id === selectedId) ?? null;
  const detail = summary.data && summary.data.building.id === selectedId ? summary.data : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <MapCanvas data={data} selectedId={selectedId} onSelect={setSelectedId} />

      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
        {selected ? (
          <div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs font-semibold text-[#a5174d] hover:text-[#8e123f]"
            >
              ← All buildings
            </button>
            <h3 className="mt-3 text-lg font-semibold tracking-tight text-slate-900">{selected.name}</h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {TYPE_STYLE[selected.buildingType].label}
              {selected.hostel ? ` · ${selected.hostel.name}` : ""} · {selected.code}
            </p>

            <dl className="mt-5 grid grid-cols-3 gap-2 text-center">
              {[
                ["Pending", detail?.pending],
                ["In progress", detail?.inProgress],
                ["Resolved", detail?.resolved],
              ].map(([label, value]) => (
                <div key={label as string} className="rounded-xl bg-slate-50 px-2 py-3">
                  <dt className="text-[11px] text-slate-500">{label}</dt>
                  <dd className="mt-1 text-lg font-semibold text-slate-900">{value ?? "–"}</dd>
                </div>
              ))}
            </dl>

            <h4 className="mt-6 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Recent requests</h4>
            {summary.error && <p className="mt-2 text-xs text-red-600">{summary.error}</p>}
            {detail && detail.recent.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">No requests you can see in this building.</p>
            )}
            <ul className="mt-2 divide-y divide-slate-100">
              {detail?.recent.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="text-sm font-medium text-slate-800">{c.title}</p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                    <StatusBadge status={c.status} />
                    <span>{c.complaintNumber}</span>
                    <span>{formatDate(c.createdAt)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {reportHref && (
              <Link
                href={`${reportHref}?buildingId=${selected.id}`}
                className="mt-5 inline-flex h-10 w-full items-center justify-center rounded-lg bg-[#a5174d] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#8e123f]"
              >
                Report a problem here
              </Link>
            )}
          </div>
        ) : (
          <div>
            <h3 className="text-sm font-semibold text-slate-900">{data.name ?? "Campus"}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Select a building on the map or from this list to see its requests.
            </p>
            <ul className="mt-4 max-h-[460px] space-y-1 overflow-y-auto">
              {data.buildings.map((b) => (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(b.id)}
                    className="flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  >
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0 rounded-sm border"
                      style={{ background: TYPE_STYLE[b.buildingType].fill, borderColor: TYPE_STYLE[b.buildingType].stroke }}
                    />
                    <span className="min-w-0 flex-1 truncate">{b.name}</span>
                    {b.openRequests > 0 && (
                      <span className="rounded-full bg-[#a5174d] px-2 py-0.5 text-[10px] font-bold text-white">
                        {b.openRequests} open
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </aside>
    </div>
  );
}

function MapCanvas({
  data,
  selectedId,
  onSelect,
}: {
  data: CampusMapData;
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const { project, height } = useMemo(() => makeProjector(data.bounds!), [data.bounds]);
  const shapes = useMemo(
    () =>
      data.buildings.map((b) => ({
        building: b,
        path: toPath(b.geometry, project),
        centre: centre(b.geometry, project),
      })),
    [data.buildings, project],
  );
  const boundary = useMemo(() => (data.boundary ? toPath(data.boundary, project) : null), [data.boundary, project]);

  const pad = 30;
  const full = { x: -pad, y: -pad, w: WIDTH + pad * 2, h: height + pad * 2 };
  // Open on the buildings rather than the whole boundary, which is mostly open ground
  const home = useMemo(() => {
    const points = data.buildings.flatMap((b) => polygons(b.geometry).flatMap((poly) => poly[0].map(project)));
    if (!points.length) return { zoom: 1, centre: [full.x + full.w / 2, full.y + full.h / 2] as [number, number] };
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const fit = 0.8 * Math.min(full.w / Math.max(maxX - minX, 1), full.h / Math.max(maxY - minY, 1));
    return {
      zoom: Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, fit)),
      centre: [(minX + maxX) / 2, (minY + maxY) / 2] as [number, number],
    };
  }, [data.buildings, project, full.x, full.y, full.w, full.h]);
  const [zoom, setZoom] = useState(home.zoom);
  const [centreAt, setCentreAt] = useState<[number, number]>(home.centre);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const w = full.w / zoom;
  const h = full.h / zoom;
  // Map units per screen pixel, so labels and badges keep a readable size at every zoom level
  const [box, setBox] = useState<{ width: number; height: number }>({ width: 900, height: 520 });
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(() => setBox({ width: svg.clientWidth, height: svg.clientHeight }));
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const u = 1 / Math.min(box.width / w, box.height / h);
  const viewBox = `${centreAt[0] - w / 2} ${centreAt[1] - h / 2} ${w} ${h}`;
  const typesShown = Array.from(new Set(data.buildings.map((b) => b.buildingType)));

  function changeZoom(factor: number) {
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * factor)));
  }

  function onPointerDown(event: PointerEvent<SVGSVGElement>) {
    drag.current = { x: event.clientX, y: event.clientY, moved: false };
  }

  function onPointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!drag.current || !svgRef.current) return;
    const dx = event.clientX - drag.current.x;
    const dy = event.clientY - drag.current.y;
    if (!drag.current.moved && Math.hypot(dx, dy) < 4) return;
    if (!drag.current.moved) svgRef.current.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, moved: true };
    setCentreAt(([cx, cy]) => [cx - dx * u, cy - dy * u]);
  }

  function onPointerUp() {
    drag.current = null;
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
      <div className="relative overflow-hidden rounded-xl bg-[#f3f4f1]">
        <svg
          ref={svgRef}
          viewBox={viewBox}
          role="img"
          aria-label={`Map of ${data.name ?? "the campus"} with ${data.buildings.length} buildings`}
          className="block h-[520px] w-full cursor-grab touch-none select-none active:cursor-grabbing"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {boundary && (
            <path d={boundary} fill="#ffffff" stroke="#a5174d" strokeWidth={2.5} strokeDasharray="8 5" vectorEffect="non-scaling-stroke" />
          )}
          {shapes.map(({ building: b, path }) => {
            const style = TYPE_STYLE[b.buildingType];
            const selected = b.id === selectedId;
            return (
              <path
                key={b.id}
                d={path}
                fill={style.fill}
                stroke={style.stroke}
                strokeWidth={selected ? 3 : 1.25}
                vectorEffect="non-scaling-stroke"
                fillOpacity={selected ? 1 : 0.85}
                role="button"
                tabIndex={0}
                aria-label={`${b.name}${b.openRequests ? `, ${b.openRequests} open requests` : ""}`}
                aria-pressed={selected}
                className="cursor-pointer outline-none transition-[fill-opacity] hover:fill-opacity-100 focus-visible:stroke-[#a5174d]"
                onClick={() => {
                  if (!drag.current?.moved) onSelect(b.id);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelect(b.id);
                  }
                }}
              >
                <title>{b.name}</title>
              </path>
            );
          })}
          {/* Labels and badges sit above every building, so a neighbouring shape never hides them */}
          <g pointerEvents="none">
            {shapes.map(({ building: b, centre: [cx, cy] }) => (
              <g key={b.id}>
                {(zoom >= home.zoom * 1.5 || b.id === selectedId) && (
                  <text
                    x={cx}
                    y={cy + 22 * u}
                    textAnchor="middle"
                    fontSize={12 * u}
                    fontWeight={600}
                    fill="#0f172a"
                    stroke="#ffffff"
                    strokeWidth={3 * u}
                    paintOrder="stroke"
                  >
                    {b.name}
                  </text>
                )}
                {b.openRequests > 0 && (
                  <g transform={`translate(${cx} ${cy}) scale(${u})`}>
                    <circle r={11} fill="#a5174d" stroke="#ffffff" strokeWidth={2} />
                    <text textAnchor="middle" dy="0.35em" fontSize={11} fontWeight={700} fill="#ffffff">
                      {b.openRequests}
                    </text>
                  </g>
                )}
              </g>
            ))}
          </g>
        </svg>

        <div className="absolute right-3 top-3 flex flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          {[
            ["+", "Zoom in", () => changeZoom(1.5)],
            ["−", "Zoom out", () => changeZoom(1 / 1.5)],
          ].map(([label, title, action]) => (
            <button
              key={title as string}
              type="button"
              aria-label={title as string}
              onClick={action as () => void}
              className="h-11 w-11 border-b border-slate-200 text-lg font-semibold text-slate-700 hover:bg-slate-50"
            >
              {label as string}
            </button>
          ))}
          <button
            type="button"
            aria-label="Reset view"
            onClick={() => {
              setZoom(home.zoom);
              setCentreAt(home.centre);
            }}
            className="h-11 w-11 text-[10px] font-semibold text-slate-600 hover:bg-slate-50"
          >
            Reset
          </button>
        </div>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[11px] text-slate-600" aria-label="Map legend">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="h-0 w-4 border-t-2 border-dashed border-[#a5174d]" />
          Campus boundary
        </li>
        {typesShown.map((t) => (
          <li key={t} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="h-3 w-3 rounded-sm border"
              style={{ background: TYPE_STYLE[t].fill, borderColor: TYPE_STYLE[t].stroke }}
            />
            {TYPE_STYLE[t].label}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="flex h-4 w-4 items-center justify-center rounded-full bg-[#a5174d] text-[8px] font-bold text-white">
            n
          </span>
          Open requests you can see
        </li>
      </ul>
    </section>
  );
}
