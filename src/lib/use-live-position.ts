"use client";

import { useSyncExternalStore } from "react";

export interface LivePosition {
  lat: number;
  lng: number;
  accuracy: number;
}

export type LocationProblem = "unsupported" | "denied" | "unavailable" | "slow";

interface LocationState {
  position: LivePosition | null;
  problem: LocationProblem | null;
}

// One GPS watch for the whole webview. It outlives the page that started it,
// so switching tabs and coming back shows the live reading at once instead of
// asking the device, and the user, for location again.
const KEEP_ALIVE_MS = 3 * 60_000;
const SLOW_FIX_MS = 8_000;
const IDLE: LocationState = { position: null, problem: null };

let state: LocationState = IDLE;
let watchId: number | null = null;
let stopTimer: ReturnType<typeof setTimeout> | undefined;
let slowTimer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function publish(next: LocationState) {
  state = next;
  for (const listener of listeners) listener();
}

function stopWatch() {
  clearTimeout(slowTimer);
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = null;
}

function startWatch() {
  if (watchId !== null) return;
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    publish({ position: null, problem: "unsupported" });
    return;
  }
  slowTimer = setTimeout(() => {
    if (!state.position && !state.problem) publish({ position: null, problem: "slow" });
  }, SLOW_FIX_MS);
  watchId = navigator.geolocation.watchPosition(
    (reading) => {
      clearTimeout(slowTimer);
      publish({
        position: {
          lat: reading.coords.latitude,
          lng: reading.coords.longitude,
          accuracy: reading.coords.accuracy,
        },
        problem: null,
      });
    },
    (error) => {
      clearTimeout(slowTimer);
      if (error.code === error.PERMISSION_DENIED) {
        // A refused watch never recovers by itself; retrying asks again.
        stopWatch();
        publish({ position: null, problem: "denied" });
      } else if (!state.position) {
        publish({ position: null, problem: "unavailable" });
      }
      // Any other error keeps the last good reading while the watch goes on.
    },
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 },
  );
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  clearTimeout(stopTimer);
  startWatch();
  return () => {
    listeners.delete(listener);
    if (listeners.size > 0) return;
    stopTimer = setTimeout(() => {
      // A reading is only kept while a watch is refreshing it.
      stopWatch();
      state = IDLE;
    }, KEEP_ALIVE_MS);
  };
}

function retry() {
  stopWatch();
  publish(IDLE);
  startWatch();
}

/** Live device position shared by every component on the page. */
export function useLivePosition() {
  const current = useSyncExternalStore(subscribe, () => state, () => IDLE);
  return { ...current, locating: !current.position && !current.problem, retry };
}
