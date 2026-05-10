"use client";

import dynamic from "next/dynamic";

const Inner = dynamic(() => import("./geofence-map-inner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-72 w-full items-center justify-center rounded-lg border border-navy-100 bg-navy-50 text-sm text-navy-500">
      Loading map...
    </div>
  ),
});

export interface MapPoint {
  id: string;
  lat: number;
  lng: number;
  label: string;
  status: "ontime" | "late" | "absent" | "early";
}

export function GeofenceMap(props: {
  centerLat: number;
  centerLng: number;
  radiusM: number;
  points: MapPoint[];
}) {
  return <Inner {...props} />;
}
