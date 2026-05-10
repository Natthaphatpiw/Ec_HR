"use client";

import { useEffect } from "react";
import { Circle, MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { MapPoint } from "./geofence-map";

const orangeIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#FB923C;border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.15)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const navyIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#0F172A;border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.15)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});
const amberIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:9999px;background:#f59e0b;border:2px solid #fff;box-shadow:0 0 0 1px rgba(15,23,42,0.15)"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 50);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export default function GeofenceMapInner({
  centerLat,
  centerLng,
  radiusM,
  points,
}: {
  centerLat: number;
  centerLng: number;
  radiusM: number;
  points: MapPoint[];
}) {
  return (
    <div className="h-72 w-full overflow-hidden rounded-lg border border-navy-100">
      <MapContainer
        center={[centerLat, centerLng]}
        zoom={17}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Circle
          center={[centerLat, centerLng]}
          radius={radiusM}
          pathOptions={{
            color: "#FB923C",
            weight: 2,
            fillColor: "#FB923C",
            fillOpacity: 0.08,
          }}
        />
        {points.map((p) => (
          <Marker
            key={p.id}
            position={[p.lat, p.lng]}
            icon={p.status === "late" ? amberIcon : p.status === "ontime" ? orangeIcon : navyIcon}
          >
            <Popup>
              <div className="text-xs">
                <div className="font-semibold">{p.label}</div>
                <div className="text-navy-500">{p.status}</div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
