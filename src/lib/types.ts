/**
 * Plain JSON shapes shared by the server and the browser.
 *
 * These types deliberately contain no Prisma or Node APIs so they can be
 * imported from client components.
 */

export type ThemePreference = "light" | "dark" | "system";
export type CalendarView = "month" | "week" | "day" | "list";
export type HabitStatus = "active" | "paused" | "archived";
export type OccurrenceStatus = "pending" | "partial" | "completed" | "skipped";
export type TimerStatus = "running" | "paused" | "completed" | "stopped";

export interface UserDTO {
  id: string;
  name: string;
  email: string;
  timezone: string;
  weekStartsOn: number;
  theme: ThemePreference;
  accentHue: number;
  defaultCalendarView: CalendarView;
  createdAt: string;
}

export interface NotificationSettingsDTO {
  inApp: boolean;
  browser: boolean;
  reminderLeadMinutes: number;
  quietFrom: string | null;
  quietUntil: string | null;
}

export interface CategoryDTO {
  id: string;
  name: string;
  hue: number;
}

export interface StepDTO {
  id: string;
  name: string;
  required: boolean;
  sortOrder: number;
}

export interface HabitDTO {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  hue: number;
  categoryId: string | null;
  categoryName: string | null;
  frequency: string;
  interval: number;
  weekdays: number[];
  monthDays: number[];
  startDate: string;
  endDate: string | null;
  reminderTime: string | null;
  timerMinutes: number;
  status: HabitStatus;
  sortOrder: number;
  scheduleLabel: string;
  steps: StepDTO[];
  createdAt: string;
}

export interface TimerDTO {
  id: string;
  habitId: string | null;
  occurrenceId: string | null;
  date: string | null;
  label: string | null;
  durationMs: number;
  accumulatedMs: number;
  remainingMs: number;
  status: TimerStatus;
  endsAt: string | null;
  startedAt: string;
  completedAt: string | null;
}

export interface StepStateDTO {
  id: string;
  name: string;
  required: boolean;
  checked: boolean;
  checkedAt: string | null;
}

export interface OccurrenceDTO {
  id: string;
  habitId: string;
  scheduledDate: string;
  date: string;
  status: OccurrenceStatus;
  completedAt: string | null;
  timerMs: number;
  note: string | null;
  source: "schedule" | "manual";
  habit: HabitDTO;
  steps: StepStateDTO[];
  doneSteps: number;
  requiredSteps: number;
  requiredDone: number;
  allStepsDone: boolean;
  timerRequiredMs: number;
  timerSatisfied: boolean;
  canComplete: boolean;
  progress: number;
  timer: TimerDTO | null;
}

export interface TaskDTO {
  id: string;
  title: string;
  notes: string | null;
  date: string;
  time: string | null;
  hue: number;
  categoryId: string | null;
  categoryName: string | null;
  completed: boolean;
  completedAt: string | null;
}

export interface DayStatDTO {
  date: string;
  scheduled: number;
  completed: number;
  partial: number;
  missed: number;
  rate: number;
  timerMinutes: number;
}

export interface HabitStatDTO {
  habitId: string;
  name: string;
  hue: number;
  icon: string | null;
  categoryId: string | null;
  categoryName: string | null;
  scheduled: number;
  completed: number;
  partial: number;
  missed: number;
  rate: number;
  currentStreak: number;
  longestStreak: number;
  timerMinutes: number;
}

export interface CategoryStatDTO {
  categoryId: string | null;
  name: string;
  hue: number;
  scheduled: number;
  completed: number;
  partial: number;
  rate: number;
}

export interface PeriodStatDTO {
  key: string;
  label: string;
  start: string;
  end: string;
  scheduled: number;
  completed: number;
  partial: number;
  rate: number;
}

export interface HeatmapHabitDTO {
  habitId: string;
  name: string;
  hue: number;
  status: OccurrenceStatus;
  doneSteps: number;
  requiredSteps: number;
}

export interface HeatmapCellDTO {
  date: string;
  scheduled: number;
  completed: number;
  partial: number;
  missed: number;
  rate: number;
  status: "none" | "complete" | "partial" | "missed";
  habits: HeatmapHabitDTO[];
}

export interface ActivityItemDTO {
  id: string;
  kind: "completion" | "step" | "task" | "streak";
  title: string;
  detail: string;
  hue: number;
  at: string;
  date: string;
}

export interface StatsSummaryDTO {
  scheduled: number;
  completed: number;
  partial: number;
  missed: number;
  rate: number;
  completedToday: number;
  scheduledToday: number;
  currentStreak: number;
  longestStreak: number;
  timerMinutes: number;
  activeDays: number;
  perfectDays: number;
  totalHabits: number;
}

export interface StatsDTO {
  range: { from: string; to: string; days: number };
  summary: StatsSummaryDTO;
  daily: DayStatDTO[];
  weekly: PeriodStatDTO[];
  monthly: PeriodStatDTO[];
  yearly: PeriodStatDTO[];
  habits: HabitStatDTO[];
  categories: CategoryStatDTO[];
  heatmap: HeatmapCellDTO[];
  bestHabit: HabitStatDTO | null;
  worstHabit: HabitStatDTO | null;
}

export interface OverviewDTO {
  user: UserDTO;
  notifications: NotificationSettingsDTO;
  categories: CategoryDTO[];
  habits: HabitDTO[];
  today: OccurrenceDTO[];
  timers: TimerDTO[];
  todayTasks: TaskDTO[];
  upcomingTasks: TaskDTO[];
  stats: StatsDTO;
  recent: ActivityItemDTO[];
  serverNow: string;
}

export interface CalendarDayDTO {
  date: string;
  occurrences: OccurrenceDTO[];
  tasks: TaskDTO[];
}

export interface CalendarDTO {
  from: string;
  to: string;
  days: CalendarDayDTO[];
}

export interface ReminderDTO {
  habitId: string;
  habitName: string;
  hue: number;
  time: string;
  date: string;
  message: string;
}

export interface SessionDTO {
  id: string;
  current: boolean;
  deviceLabel: string | null;
  ipAddress: string | null;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
}

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  error?: string;
}
