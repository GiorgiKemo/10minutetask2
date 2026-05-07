export type HabitColor = "sage" | "blue" | "violet" | "amber"

export type Habit = {
  id: string
  name: string
  target: string
  color: HabitColor
  streak: number
  completions: Record<string, boolean>
}

export type HabitTrackerState = {
  habits: Habit[]
  updatedAt: number
}

// The demo starts with a realistic week so the UI feels populated immediately.
export const defaultHabits: Habit[] = [
  {
    id: "morning-run",
    name: "Morning Run",
    target: "30 minutes",
    color: "sage",
    streak: 12,
    completions: {
      "-3": true,
      "-2": true,
      "-1": true,
      "0": true,
    },
  },
  {
    id: "read",
    name: "Read",
    target: "20 pages",
    color: "blue",
    streak: 8,
    completions: {
      "-3": true,
      "-2": true,
      "0": true,
    },
  },
  {
    id: "meditate",
    name: "Meditate",
    target: "10 minutes",
    color: "violet",
    streak: 15,
    completions: {
      "-3": true,
      "-2": true,
      "-1": true,
      "0": true,
    },
  },
  {
    id: "drink-water",
    name: "Drink Water",
    target: "8 glasses",
    color: "blue",
    streak: 6,
    completions: {
      "-3": true,
      "-1": true,
    },
  },
  {
    id: "strength-training",
    name: "Strength Training",
    target: "3x per week",
    color: "sage",
    streak: 4,
    completions: {
      "-2": true,
    },
  },
  {
    id: "focus-work",
    name: "Focus Work",
    target: "90 minutes",
    color: "blue",
    streak: 9,
    completions: {
      "-3": true,
      "-2": true,
      "-1": true,
      "0": true,
    },
  },
]

export const defaultTrackerState: HabitTrackerState = {
  habits: defaultHabits,
  updatedAt: 0,
}

export function createHabit(name: string): Habit {
  const id = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")

  return {
    id: `${id || "habit"}-${Date.now()}`,
    name: name.trim() || "New Habit",
    target: "Daily",
    color: "sage",
    streak: 0,
    completions: {},
  }
}

