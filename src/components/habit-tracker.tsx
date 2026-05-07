"use client"

import * as React from "react"
import {
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Circle,
  Cloud,
  Flame,
  Focus,
  Home,
  ListChecks,
  Loader2,
  Menu,
  Moon,
  Plus,
  Settings,
  Sprout,
  Target,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import {
  createHabit,
  defaultTrackerState,
  type Habit,
  type HabitColor,
  type HabitTrackerState,
} from "@/lib/habit-data"
import {
  getPuterClient,
  isTrackerState,
  PUTER_KV_KEY,
} from "@/lib/puter-sync"

const LOCAL_STORAGE_KEY = "puterjs-habit-tracker-local"

const colorStyles: Record<
  HabitColor,
  { icon: string; soft: string; text: string; ring: string }
> = {
  sage: {
    icon: "bg-primary/10 text-primary",
    soft: "bg-primary/10",
    text: "text-primary",
    ring: "ring-primary/25",
  },
  blue: {
    icon: "bg-[var(--habit-blue-soft)] text-[var(--habit-blue)]",
    soft: "bg-[var(--habit-blue-soft)]",
    text: "text-[var(--habit-blue)]",
    ring: "ring-[var(--habit-blue)]/25",
  },
  violet: {
    icon: "bg-[var(--habit-violet-soft)] text-[var(--habit-violet)]",
    soft: "bg-[var(--habit-violet-soft)]",
    text: "text-[var(--habit-violet)]",
    ring: "ring-[var(--habit-violet)]/25",
  },
  amber: {
    icon: "bg-[var(--habit-amber-soft)] text-[var(--habit-amber)]",
    soft: "bg-[var(--habit-amber-soft)]",
    text: "text-[var(--habit-amber)]",
    ring: "ring-[var(--habit-amber)]/25",
  },
}

const navItems = [
  { label: "Today", icon: Home, active: true },
  { label: "Week", icon: CalendarDays },
  { label: "Habits", icon: ListChecks },
  { label: "Stats", icon: BarChart3 },
  { label: "Settings", icon: Settings },
]

const weekdayFormatter = new Intl.DateTimeFormat("en", { weekday: "short" })
const shortDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
})
const longDateFormatter = new Intl.DateTimeFormat("en", {
  weekday: "long",
  month: "long",
  day: "numeric",
})

export function HabitTracker() {
  const week = React.useMemo(() => getDemoWeek(), [])
  const [state, setState] =
    React.useState<HabitTrackerState>(defaultTrackerState)
  const [loadedLocalState, setLoadedLocalState] = React.useState(false)
  const [syncStatus, setSyncStatus] = React.useState("Ready for Puter sync")
  const [isSyncing, setIsSyncing] = React.useState(false)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [newHabitName, setNewHabitName] = React.useState("")

  const today = week.find((day) => day.offset === 0) ?? week[3]
  const completedToday = state.habits.filter((habit) =>
    isHabitDone(habit, today.key)
  ).length
  const weeklyTotal = state.habits.length * week.length
  const weeklyDone = state.habits.reduce(
    (count, habit) =>
      count + week.filter((day) => isHabitDone(habit, day.key)).length,
    0
  )
  const weeklyProgress = weeklyTotal ? Math.round((weeklyDone / weeklyTotal) * 100) : 0
  const todayProgress = state.habits.length
    ? Math.round((completedToday / state.habits.length) * 100)
    : 0

  React.useEffect(() => {
    let cancelled = false

    // Defer localStorage hydration so the first prerendered frame remains stable.
    queueMicrotask(() => {
      if (cancelled) return

      const cachedState = window.localStorage.getItem(LOCAL_STORAGE_KEY)

      if (cachedState) {
        try {
          const parsed = JSON.parse(cachedState)
          if (isTrackerState(parsed)) {
            setState(parsed)
          }
        } catch {
          window.localStorage.removeItem(LOCAL_STORAGE_KEY)
        }
      }

      setLoadedLocalState(true)
    })

    return () => {
      cancelled = true
    }
  }, [])

  React.useEffect(() => {
    if (loadedLocalState) {
      window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
    }
  }, [loadedLocalState, state])

  function updateState(updater: (current: HabitTrackerState) => HabitTrackerState) {
    setState((current) => ({ ...updater(current), updatedAt: Date.now() }))
  }

  function toggleHabit(habitId: string, dayKey: string, checked: boolean) {
    updateState((current) => ({
      ...current,
      habits: current.habits.map((habit) =>
        habit.id === habitId
          ? {
              ...habit,
              completions: {
                ...habit.completions,
                [dayKey]: checked,
              },
            }
          : habit
      ),
    }))
  }

  function addHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    updateState((current) => ({
      ...current,
      habits: [...current.habits, createHabit(newHabitName)],
    }))

    setNewHabitName("")
    setDialogOpen(false)
  }

  async function syncWithPuter() {
    setIsSyncing(true)
    setSyncStatus("Opening Puter sign in")

    try {
      const puter = await getPuterClient()

      if (!puter.auth.isSignedIn()) {
        await puter.auth.signIn()
      }

      const user = await puter.auth.getUser()
      const cloudState = await puter.kv.get<HabitTrackerState>(PUTER_KV_KEY)

      if (isTrackerState(cloudState) && cloudState.updatedAt > state.updatedAt) {
        setState(cloudState)
        setSyncStatus(`Loaded Puter cloud data for ${user.username}`)
        return
      }

      await puter.kv.set(PUTER_KV_KEY, state)
      setSyncStatus(`Synced to Puter as ${user.username}`)
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Puter sync was cancelled"
      setSyncStatus(message)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <main className="min-h-svh bg-background text-foreground">
      <div className="mx-auto flex min-h-svh max-w-[1500px]">
        <DesktopSidebar
          syncStatus={syncStatus}
          isSyncing={isSyncing}
          onSync={syncWithPuter}
        />

        <section className="flex min-w-0 flex-1 flex-col">
          <TopBar />

          <div className="flex flex-1 flex-col gap-4 px-4 py-4 sm:px-5 lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-6 lg:px-6 lg:py-6 xl:grid-cols-[minmax(0,1fr)_340px]">
            <WeekPanel
              habits={state.habits}
              week={week}
              todayKey={today.key}
              onToggleHabit={toggleHabit}
              dialogOpen={dialogOpen}
              setDialogOpen={setDialogOpen}
              newHabitName={newHabitName}
              setNewHabitName={setNewHabitName}
              onAddHabit={addHabit}
            />

            <TodayPanel
              habits={state.habits}
              today={today}
              completedToday={completedToday}
              todayProgress={todayProgress}
              weeklyProgress={weeklyProgress}
            />
          </div>
        </section>
      </div>

      <MobileNavigation
        syncStatus={syncStatus}
        isSyncing={isSyncing}
        onSync={syncWithPuter}
      />
    </main>
  )
}

function DesktopSidebar({
  syncStatus,
  isSyncing,
  onSync,
}: {
  syncStatus: string
  isSyncing: boolean
  onSync: () => void
}) {
  return (
    <aside className="hidden w-[292px] shrink-0 border-r bg-sidebar px-4 py-5 lg:flex lg:flex-col">
      <div className="flex items-center gap-3 px-1">
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <CheckCircle2 />
        </div>
        <h1 className="text-xl font-semibold tracking-normal">
          Puter.js Habit Tracker
        </h1>
      </div>

      <nav className="mt-10 flex flex-col gap-1">
        {navItems.map((item) => (
          <Button
            key={item.label}
            variant={item.active ? "secondary" : "ghost"}
            className={cn(
              "h-11 justify-start gap-3 px-3 text-[0.95rem]",
              item.active && "bg-primary/10 text-primary hover:bg-primary/10"
            )}
          >
            <item.icon data-icon="inline-start" />
            {item.label}
          </Button>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="outline" className="h-11" onClick={onSync} />}
          >
            {isSyncing ? (
              <Loader2 data-icon="inline-start" className="animate-spin" />
            ) : (
              <Cloud data-icon="inline-start" />
            )}
            Sync with Puter
          </TooltipTrigger>
          <TooltipContent>{syncStatus}</TooltipContent>
        </Tooltip>
        <a
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          href="https://developer.puter.com"
          target="_blank"
          rel="noreferrer"
        >
          <span className="grid size-7 place-items-center rounded-md bg-[var(--habit-blue)] text-xs font-semibold text-white">
            P
          </span>
          Powered by Puter
        </a>
      </div>
    </aside>
  )
}

function TopBar() {
  return (
    <header className="flex h-[76px] items-center justify-between border-b px-4 sm:px-5 lg:px-6">
      <div className="flex items-center gap-3 lg:hidden">
        <div className="grid size-9 place-items-center rounded-lg bg-primary text-primary-foreground">
          <CheckCircle2 />
        </div>
        <div>
          <h1 className="text-base font-semibold">Puter.js Habit Tracker</h1>
          <p className="text-xs text-muted-foreground">Today</p>
        </div>
      </div>

      <div className="hidden flex-col lg:flex">
        <p className="text-xs font-medium uppercase tracking-normal text-muted-foreground">
          Today
        </p>
        <p className="text-sm text-muted-foreground">
          {longDateFormatter.format(new Date())}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" />}>
            <Moon />
            <span className="sr-only">Theme</span>
          </TooltipTrigger>
          <TooltipContent>System theme</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger render={<Button variant="ghost" size="icon" />}>
            <Menu />
            <span className="sr-only">Menu</span>
          </TooltipTrigger>
          <TooltipContent>App menu</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}

function WeekPanel({
  habits,
  week,
  todayKey,
  onToggleHabit,
  dialogOpen,
  setDialogOpen,
  newHabitName,
  setNewHabitName,
  onAddHabit,
}: {
  habits: Habit[]
  week: WeekDay[]
  todayKey: string
  onToggleHabit: (habitId: string, dayKey: string, checked: boolean) => void
  dialogOpen: boolean
  setDialogOpen: (open: boolean) => void
  newHabitName: string
  setNewHabitName: (name: string) => void
  onAddHabit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Card className="rounded-lg py-0 shadow-none">
      <CardHeader className="border-b px-4 py-4 sm:px-5">
        <div>
          <CardTitle className="text-lg">Week</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatWeekRange(week)}
          </p>
        </div>
        <CardAction>
          <AddHabitDialog
            open={dialogOpen}
            setOpen={setDialogOpen}
            value={newHabitName}
            setValue={setNewHabitName}
            onSubmit={onAddHabit}
          />
        </CardAction>
      </CardHeader>

      <CardContent className="px-0">
        <div className="overflow-x-auto">
          <div className="min-w-[640px]">
            <div className="grid grid-cols-[160px_repeat(7,minmax(64px,1fr))] border-b bg-muted/35">
              <div className="px-4 py-3 text-xs font-medium text-muted-foreground">
                Habits
              </div>
              {week.map((day) => (
                <div
                  key={day.key}
                  className={cn(
                    "flex flex-col items-center gap-1 border-l px-2 py-3 text-center",
                    day.key === todayKey && "bg-primary/10 text-primary"
                  )}
                >
                  <span className="text-xs font-medium">
                    {weekdayFormatter.format(day.date)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {shortDateFormatter.format(day.date)}
                  </span>
                </div>
              ))}
            </div>

            {habits.map((habit) => (
              <div
                key={habit.id}
                className="grid grid-cols-[160px_repeat(7,minmax(64px,1fr))] border-b last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3 px-4 py-3">
                  <HabitIcon habit={habit} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{habit.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {habit.target}
                    </p>
                  </div>
                </div>

                {week.map((day) => {
                  const checked = isHabitDone(habit, day.key)
                  return (
                    <div
                      key={day.key}
                      className={cn(
                        "grid place-items-center border-l px-2 py-3",
                        day.key === todayKey && "bg-primary/10"
                      )}
                    >
                      <Checkbox
                        aria-label={`${habit.name} on ${weekdayFormatter.format(day.date)}`}
                        checked={checked}
                        onCheckedChange={(value) =>
                          onToggleHabit(habit.id, day.key, value === true)
                        }
                        className={cn(
                          "size-6 rounded-full",
                          checked && "border-primary bg-primary"
                        )}
                      />
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 px-4 py-4 text-xs text-muted-foreground sm:px-5">
          <LegendItem icon={<Check />} label="Completed" />
          <LegendItem icon={<Circle />} label="Not done" />
          <LegendItem icon={<Flame />} label="Current streak" accent />
        </div>
      </CardContent>
    </Card>
  )
}

function TodayPanel({
  habits,
  today,
  completedToday,
  todayProgress,
  weeklyProgress,
}: {
  habits: Habit[]
  today: WeekDay
  completedToday: number
  todayProgress: number
  weeklyProgress: number
}) {
  const nextHabit = habits.find((habit) => !isHabitDone(habit, today.key))
  const topStreaks = [...habits].sort((a, b) => b.streak - a.streak).slice(0, 3)

  return (
    <aside className="flex flex-col gap-4">
      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle>Today</CardTitle>
          <CardAction>
            <CalendarDays className="size-5 text-muted-foreground" />
          </CardAction>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div>
            <p className="text-sm font-medium text-primary">
              {longDateFormatter.format(today.date)}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {completedToday} of {habits.length} habits completed
            </p>
          </div>
          <Progress value={todayProgress} />
          <Separator />
          <div className="flex flex-col gap-3">
            <p className="text-sm font-medium">Up next</p>
            {nextHabit ? (
              <div className="flex items-center gap-3 rounded-lg border bg-muted/30 p-3">
                <HabitIcon habit={nextHabit} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {nextHabit.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {nextHabit.target}
                  </p>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border bg-primary/10 p-3 text-sm text-primary">
                All habits are complete for today.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-none">
        <CardContent className="grid place-items-center px-4 py-6">
          <div
            className="grid size-44 place-items-center rounded-full"
            style={{
              background: `conic-gradient(var(--primary) ${weeklyProgress}%, var(--muted) 0)`,
            }}
          >
            <div className="grid size-32 place-items-center rounded-full bg-card text-center">
              <div>
                <p className="text-3xl font-semibold">{weeklyProgress}%</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Weekly progress
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-lg shadow-none">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="size-4 text-[var(--habit-amber)]" />
            Streaks
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {topStreaks.map((habit) => (
            <div
              key={habit.id}
              className="flex items-center justify-between rounded-lg border bg-muted/25 p-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                <HabitIcon habit={habit} compact />
                <span className="truncate text-sm">{habit.name}</span>
              </div>
              <Badge variant="secondary">{habit.streak} days</Badge>
            </div>
          ))}
        </CardContent>
      </Card>
    </aside>
  )
}

function AddHabitDialog({
  open,
  setOpen,
  value,
  setValue,
  onSubmit,
}: {
  open: boolean
  setOpen: (open: boolean) => void
  value: string
  setValue: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button />}>
        <Plus data-icon="inline-start" />
        Add habit
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Add habit</DialogTitle>
            <DialogDescription>
              Create a simple habit for the weekly tracker.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="habit-name">Habit name</FieldLabel>
              <Input
                id="habit-name"
                value={value}
                onChange={(event) => setValue(event.target.value)}
                placeholder="Write daily notes"
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Save habit</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function MobileNavigation({
  syncStatus,
  isSyncing,
  onSync,
}: {
  syncStatus: string
  isSyncing: boolean
  onSync: () => void
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-3 py-2 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-md items-center justify-between gap-2">
        {navItems.slice(0, 4).map((item) => (
          <Button
            key={item.label}
            variant="ghost"
            size="sm"
            className={cn(
              "h-10 flex-1 flex-col gap-0.5 text-[0.68rem]",
              item.active && "text-primary"
            )}
          >
            <item.icon />
            {item.label}
          </Button>
        ))}
        <Tooltip>
          <TooltipTrigger
            render={<Button variant="outline" size="icon-lg" onClick={onSync} />}
          >
            {isSyncing ? <Loader2 className="animate-spin" /> : <Cloud />}
            <span className="sr-only">Sync with Puter</span>
          </TooltipTrigger>
          <TooltipContent>{syncStatus}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

function HabitIcon({ habit, compact = false }: { habit: Habit; compact?: boolean }) {
  return (
    <div
      className={cn(
        "grid shrink-0 place-items-center rounded-lg ring-1",
        compact ? "size-7" : "size-10",
        colorStyles[habit.color].icon,
        colorStyles[habit.color].ring
      )}
    >
      <HabitGlyph habit={habit} className={compact ? "size-4" : "size-5"} />
    </div>
  )
}

function HabitGlyph({ habit, className }: { habit: Habit; className?: string }) {
  const name = habit.name.toLowerCase()

  if (name.includes("run")) return <Sprout className={className} />
  if (name.includes("focus")) return <Focus className={className} />
  if (name.includes("strength")) return <Target className={className} />
  if (name.includes("meditate")) return <Moon className={className} />

  return <ListChecks className={className} />
}

function LegendItem({
  icon,
  label,
  accent = false,
}: {
  icon: React.ReactNode
  label: string
  accent?: boolean
}) {
  return (
    <span className="flex items-center gap-2">
      <span
        className={cn(
          "grid size-5 place-items-center rounded-full border",
          accent
            ? "border-transparent text-[var(--habit-amber)]"
            : "border-input text-primary"
        )}
      >
        {icon}
      </span>
      {label}
    </span>
  )
}

type WeekDay = {
  date: Date
  key: string
  offset: number
}

function getDemoWeek(): WeekDay[] {
  const today = new Date()
  const day = today.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  return Array.from({ length: 7 }, (_, index) => {
    const offset = mondayOffset + index
    const date = new Date(today)
    date.setDate(today.getDate() + offset)

    return {
      date,
      key: String(offset),
      offset,
    }
  })
}

function formatWeekRange(week: WeekDay[]) {
  const first = week[0]?.date
  const last = week[week.length - 1]?.date

  if (!first || !last) {
    return "This week"
  }

  return `${shortDateFormatter.format(first)} to ${shortDateFormatter.format(last)}`
}

function isHabitDone(habit: Habit, dayKey: string) {
  return habit.completions[dayKey] === true
}
