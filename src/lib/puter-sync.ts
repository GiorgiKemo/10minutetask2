import type puter from "@heyputer/puter.js"

import type { HabitTrackerState } from "@/lib/habit-data"

export const PUTER_KV_KEY = "puterjs-habit-tracker:v1"

type PuterClient = typeof puter

let puterPromise: Promise<PuterClient> | null = null

// Puter.js touches browser globals while booting, so the package is loaded only
// from user actions in the client instead of during server prerendering.
export function getPuterClient() {
  if (typeof window === "undefined") {
    throw new Error("Puter.js can only run in the browser.")
  }

  puterPromise ??= import("@heyputer/puter.js").then((module) => module.default)
  return puterPromise
}

export function isTrackerState(value: unknown): value is HabitTrackerState {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as HabitTrackerState).habits) &&
    typeof (value as HabitTrackerState).updatedAt === "number"
  )
}

