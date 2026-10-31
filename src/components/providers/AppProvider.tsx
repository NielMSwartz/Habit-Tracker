"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  apiFetch,
  ApiError,
  clearOfflineData,
  flushQueue,
  isOffline,
  queueCount,
  sendMutation,
  subscribeQueue,
} from "@/lib/client/api";
import type {
  CategoryDTO,
  OccurrenceDTO,
  OverviewDTO,
  TaskDTO,
  TimerDTO,
  UserDTO,
  NotificationSettingsDTO,
} from "@/lib/types";
import type { HabitInput, HabitPatch, SettingsInput, TaskInput } from "@/lib/validation";
import { useToast } from "@/components/ui/Toast";

type TimerAction = "pause" | "resume" | "stop" | "complete";
type OccurrenceAction = "skip" | "unskip" | "reschedule" | "note";

interface AppContextValue {
  user: UserDTO;
  data: OverviewDTO | null;
  categories: CategoryDTO[];
  loading: boolean;
  error: string | null;
  offline: boolean;
  queueSize: number;
  revision: number;
  refresh: (silent?: boolean) => Promise<void>;
  toggleStep: (occurrence: OccurrenceDTO, stepId: string, checked: boolean) => Promise<void>;
  completeOccurrence: (occurrence: OccurrenceDTO) => Promise<boolean>;
  startTimer: (occurrence: OccurrenceDTO) => Promise<void>;
  timerAction: (timerId: string, action: TimerAction) => Promise<void>;
  resetTimer: (timerId: string) => Promise<void>;
  createHabit: (input: HabitInput) => Promise<boolean>;
  updateHabit: (id: string, patch: HabitPatch) => Promise<boolean>;
  archiveHabit: (id: string, permanent?: boolean) => Promise<boolean>;
  restoreHabit: (id: string) => Promise<boolean>;
  addOccurrence: (habitId: string, date: string) => Promise<boolean>;
  deleteOccurrence: (occurrenceId: string) => Promise<boolean>;
  occurrenceAction: (
    occurrenceId: string,
    action: OccurrenceAction,
    payload?: { date?: string; note?: string | null },
  ) => Promise<boolean>;
  createTask: (input: TaskInput) => Promise<boolean>;
  updateTask: (id: string, patch: Partial<TaskInput> & { completed?: boolean }) => Promise<boolean>;
  deleteTask: (id: string) => Promise<boolean>;
  toggleTask: (task: TaskDTO) => Promise<void>;
  addCategory: (name: string, hue: number) => Promise<boolean>;
  updateCategory: (id: string, name: string, hue: number) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<boolean>;
  saveSettings: (input: SettingsInput) => Promise<boolean>;
  deleteAccount: (password: string) => Promise<boolean>;
  applyThemePreview: (theme: UserDTO["theme"], accentHue: number) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function applyTheme(theme: UserDTO["theme"], accentHue: number) {
  if (typeof window === "undefined") return;
  const dark =
    theme === "dark" ||
    (theme === "system" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.dataset.theme = dark ? "dark" : "light";
  document.documentElement.style.setProperty("--accent-hue", String(accentHue));
  localStorage.setItem("chromatic-theme", theme);
  localStorage.setItem("chromatic-hue", String(accentHue));
}

function applyStepChange(
  occurrence: OccurrenceDTO,
  stepId: string,
  checked: boolean,
): OccurrenceDTO {
  const now = new Date().toISOString();
  const steps = occurrence.steps.map((step) =>
    step.id === stepId
      ? { ...step, checked, checkedAt: checked ? now : null }
      : step,
  );
  const activeSteps = steps;
  const required = activeSteps.filter((step) => step.required);
  const gate = required.length > 0 ? required : activeSteps;
  const doneSteps = steps.filter((step) => step.checked).length;
  const requiredDone = gate.filter((step) => step.checked).length;
  const allStepsDone = gate.length > 0 && requiredDone === gate.length;
  const timerSatisfied =
    occurrence.timerRequiredMs <= 0 || occurrence.timerMs >= occurrence.timerRequiredMs;
  const canComplete = allStepsDone && timerSatisfied;
  const status: OccurrenceDTO["status"] =
    occurrence.status === "skipped"
      ? "skipped"
      : canComplete
        ? "completed"
        : doneSteps > 0 || occurrence.timerMs > 0
          ? "partial"
          : "pending";

  return {
    ...occurrence,
    steps,
    doneSteps,
    requiredDone,
    allStepsDone,
    canComplete,
    timerSatisfied,
    status,
    progress: steps.length > 0 ? doneSteps / steps.length : 0,
    completedAt:
      status === "completed"
        ? (occurrence.completedAt ?? now)
        : null,
  };
}

function updateOccurrenceInOverview(
  overview: OverviewDTO,
  updated: OccurrenceDTO,
): OverviewDTO {
  return {
    ...overview,
    today: overview.today.map((item) =>
      item.id === updated.id ? updated : item,
    ),
  };
}

export function AppProvider({
  initialUser,
  initialData,
  children,
}: {
  initialUser: UserDTO;
  initialData?: OverviewDTO | null;
  children: React.ReactNode;
}) {
  const toast = useToast();
  const [data, setData] = useState<OverviewDTO | null>(initialData ?? null);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);
  const [queueSize, setQueueSize] = useState(0);
  const [revision, setRevision] = useState(0);
  const inFlight = useRef(false);

  const cacheKey = `chromatic-overview-${initialUser.id}`;

  const persist = useCallback(
    (next: OverviewDTO) => {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {
        /* cache is best effort */
      }
    },
    [cacheKey],
  );

  const update = useCallback(
    (updater: (current: OverviewDTO) => OverviewDTO) => {
      setData((current) => {
        if (!current) return current;
        const next = updater(current);
        persist(next);
        return next;
      });
    },
    [persist],
  );

  const refresh = useCallback(
    async (silent = false) => {
      if (inFlight.current) return;
      inFlight.current = true;
      if (!silent) setError(null);
      try {
        const next = await apiFetch<OverviewDTO>("/api/overview");
        setData(next);
        persist(next);
        setOffline(false);
        setError(null);
        setRevision((value) => value + 1);
      } catch (cause) {
        if (cause instanceof ApiError) {
          if (cause.status !== 401) setError(cause.message);
        } else {
          setOffline(true);
          if (!data) setError("You are offline. Showing your last saved data.");
        }
      } finally {
        inFlight.current = false;
        setLoading(false);
      }
    },
    [data, persist],
  );

  // Initial load: server data or the offline cache paints instantly, then a
  // background refresh reconciles the snapshot.
  useEffect(() => {
    if (initialData) {
      persist(initialData);
    } else {
      let cached: OverviewDTO | null = null;
      try {
        const raw = localStorage.getItem(cacheKey);
        if (raw) cached = JSON.parse(raw) as OverviewDTO;
      } catch {
        cached = null;
      }
      if (cached) {
        setData(cached);
        setLoading(false);
      }
    }
    void refresh(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Offline detection + queue flushing.
  useEffect(() => {
    let mounted = true;
    const updateQueue = async () => {
      const count = await queueCount();
      if (mounted) setQueueSize(count);
    };
    void updateQueue();
    setOffline(isOffline());
    const unsub = subscribeQueue(() => void updateQueue());

    const handleOnline = async () => {
      setOffline(false);
      const { sent } = await flushQueue();
      await updateQueue();
      if (sent > 0) {
        toast.success(
          "Back online",
          `${sent} offline ${sent === 1 ? "change" : "changes"} synchronised.`,
        );
        await refresh(true);
      }
    };
    const handleOffline = () => {
      setOffline(true);
      toast.info("You're offline", "Changes will be saved on this device and synced later.");
    };
    const handleUnauthorized = () => {
      toast.error("Session expired", "Please sign in again to keep syncing.");
      setTimeout(() => {
        window.location.assign("/login?expired=1");
      }, 1200);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("chromatic:unauthorized", handleUnauthorized);
    if (!isOffline()) void flushQueue().then(updateQueue);

    return () => {
      mounted = false;
      unsub();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("chromatic:unauthorized", handleUnauthorized);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cross-device sync: poll while visible, refresh on focus.
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && navigator.onLine) {
        void refresh(true);
      }
    }, 45_000);
    const onFocus = () => {
      if (navigator.onLine) void refresh(true);
    };
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  // Apply the account theme whenever it changes.
  useEffect(() => {
    if (!data) return;
    applyTheme(data.user.theme, data.user.accentHue);
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (data.user.theme === "system") applyTheme("system", data.user.accentHue);
    };
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [data?.user.theme, data?.user.accentHue, data]);

  const applyThemePreview = useCallback(
    (theme: UserDTO["theme"], accentHue: number) => applyTheme(theme, accentHue),
    [],
  );

  const reportError = useCallback(
    (cause: unknown) => {
      const message =
        cause instanceof ApiError
          ? cause.message
          : cause instanceof Error
            ? cause.message
            : "Something went wrong. Please try again.";
      toast.error("Could not save", message);
    },
    [toast],
  );

  const toggleStep = useCallback(
    async (occurrence: OccurrenceDTO, stepId: string, checked: boolean) => {
      const optimistic = applyStepChange(occurrence, stepId, checked);
      update((current) => updateOccurrenceInOverview(current, optimistic));
      try {
        const { data: updated, queued } = await sendMutation<OccurrenceDTO>(
          "/api/steps",
          "POST",
          {
            occurrenceId: occurrence.id,
            stepId,
            checked,
            clientMutationId:
              typeof crypto !== "undefined" && "randomUUID" in crypto
                ? crypto.randomUUID()
                : `${occurrence.id}-${stepId}-${Date.now()}`,
          },
          { label: "Step completion" },
        );
        if (queued) {
          toast.info("Saved offline", "This step will sync when you're back online.");
          return;
        }
        if (updated) {
          update((current) => updateOccurrenceInOverview(current, updated));
          setRevision((value) => value + 1);
          if (updated.status === "completed" && occurrence.status !== "completed") {
            toast.success(
              `${occurrence.habit.name} complete`,
              updated.timerRequiredMs > 0
                ? "Every step and the timer are done."
                : "Every required step is done.",
            );
          }
        }
      } catch (cause) {
        update((current) => updateOccurrenceInOverview(current, occurrence));
        reportError(cause);
      }
    },
    [reportError, toast, update],
  );

  const completeOccurrence = useCallback(
    async (occurrence: OccurrenceDTO) => {
      try {
        const updated = await apiFetch<OccurrenceDTO>("/api/complete", {
          method: "POST",
          body: JSON.stringify({ occurrenceId: occurrence.id }),
        });
        update((current) => updateOccurrenceInOverview(current, updated));
        setRevision((value) => value + 1);
        toast.success(`${occurrence.habit.name} complete`, "Nicely done. Streak updated.");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [reportError, toast, update],
  );

  const startTimer = useCallback(
    async (occurrence: OccurrenceDTO) => {
      try {
        const result = await apiFetch<{ timer: TimerDTO; occurrence: OccurrenceDTO }>(
          "/api/timers",
          {
            method: "POST",
            body: JSON.stringify({ occurrenceId: occurrence.id }),
          },
        );
        update((current) => {
          const withOccurrence = updateOccurrenceInOverview(current, result.occurrence);
          return {
            ...withOccurrence,
            timers: [
              result.timer,
              ...withOccurrence.timers.filter((timer) => timer.id !== result.timer.id),
            ],
          };
        });
        setRevision((value) => value + 1);
      } catch (cause) {
        reportError(cause);
      }
    },
    [reportError, update],
  );

  const timerAction = useCallback(
    async (timerId: string, action: TimerAction) => {
      try {
        const result = await apiFetch<{
          timer: TimerDTO;
          occurrence: OccurrenceDTO | null;
        }>(`/api/timers/${timerId}`, {
          method: "PATCH",
          body: JSON.stringify({ action }),
        });
        update((current) => {
          let next = current;
          if (result.occurrence) {
            next = updateOccurrenceInOverview(next, result.occurrence);
          }
          const stillActive =
            result.timer.status === "running" || result.timer.status === "paused";
          return {
            ...next,
            timers: stillActive
              ? [result.timer, ...next.timers.filter((timer) => timer.id !== timerId)]
              : next.timers.filter((timer) => timer.id !== timerId),
          };
        });
        setRevision((value) => value + 1);
        if (action === "complete" && result.occurrence) {
          toast.success(
            "Timer finished",
            result.occurrence.canComplete
              ? "All requirements are met — your habit is complete."
              : "Focus time recorded. Finish the remaining steps to complete.",
          );
        }
      } catch (cause) {
        reportError(cause);
      }
    },
    [reportError, toast, update],
  );

  const resetTimer = useCallback(
    async (timerId: string) => {
      try {
        await apiFetch(`/api/timers/${timerId}`, { method: "DELETE" });
        update((current) => ({
          ...current,
          timers: current.timers.filter((timer) => timer.id !== timerId),
          today: current.today.map((occurrence) =>
            occurrence.timer?.id === timerId
              ? { ...occurrence, timer: null }
              : occurrence,
          ),
        }));
        setRevision((value) => value + 1);
      } catch (cause) {
        reportError(cause);
      }
    },
    [reportError, update],
  );

  const createHabit = useCallback(
    async (input: HabitInput) => {
      try {
        await apiFetch("/api/habits", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await refresh(true);
        toast.success("Habit created", `${input.name} is now on your schedule.`);
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const updateHabit = useCallback(
    async (id: string, patch: HabitPatch) => {
      try {
        await apiFetch(`/api/habits/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        await refresh(true);
        toast.success("Habit updated", "Your schedule and history were kept safe.");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const archiveHabit = useCallback(
    async (id: string, permanent = false) => {
      try {
        await apiFetch(`/api/habits/${id}${permanent ? "?permanent=true" : ""}`, {
          method: "DELETE",
        });
        await refresh(true);
        toast.success(
          permanent ? "Habit deleted" : "Habit archived",
          permanent
            ? "The habit and its history were permanently removed."
            : "It's hidden from today, and its history is intact.",
        );
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const restoreHabit = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/habits/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "active" }),
        });
        await refresh(true);
        toast.success("Habit restored", "It's back on your schedule.");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const addOccurrence = useCallback(
    async (habitId: string, date: string) => {
      try {
        await apiFetch("/api/occurrences", {
          method: "POST",
          body: JSON.stringify({ habitId, date }),
        });
        await refresh(true);
        toast.success("Added to calendar", "The habit is scheduled for that day.");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const deleteOccurrence = useCallback(
    async (occurrenceId: string) => {
      try {
        await apiFetch(`/api/occurrences/${occurrenceId}`, { method: "DELETE" });
        await refresh(true);
        toast.success("Removed from calendar");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const occurrenceAction = useCallback(
    async (
      occurrenceId: string,
      action: OccurrenceAction,
      payload: { date?: string; note?: string | null } = {},
    ) => {
      try {
        await apiFetch(`/api/occurrences/${occurrenceId}`, {
          method: "PATCH",
          body: JSON.stringify({ action, ...payload }),
        });
        await refresh(true);
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError],
  );

  const createTask = useCallback(
    async (input: TaskInput) => {
      try {
        await apiFetch("/api/tasks", {
          method: "POST",
          body: JSON.stringify(input),
        });
        await refresh(true);
        toast.success("Task scheduled", `${input.title} was added to your calendar.`);
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const updateTask = useCallback(
    async (id: string, patch: Partial<TaskInput> & { completed?: boolean }) => {
      try {
        await apiFetch(`/api/tasks/${id}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
        await refresh(true);
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError],
  );

  const deleteTask = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
        await refresh(true);
        toast.success("Task deleted");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const toggleTask = useCallback(
    async (task: TaskDTO) => {
      const optimistic: TaskDTO = {
        ...task,
        completed: !task.completed,
        completedAt: task.completed ? null : new Date().toISOString(),
      };
      const patchList = (list: TaskDTO[]) =>
        list.map((item) => (item.id === task.id ? optimistic : item));
      update((current) => ({
        ...current,
        todayTasks: patchList(current.todayTasks),
        upcomingTasks: patchList(current.upcomingTasks),
      }));
      try {
        const { queued } = await sendMutation<TaskDTO>(
          `/api/tasks/${task.id}`,
          "PATCH",
          { completed: optimistic.completed },
          { label: "Task completion" },
        );
        if (queued) {
          toast.info("Saved offline", "The task will sync when you're back online.");
          return;
        }
        setRevision((value) => value + 1);
        await refresh(true);
      } catch (cause) {
        update((current) => ({
          ...current,
          todayTasks: current.todayTasks.map((item) =>
            item.id === task.id ? task : item,
          ),
          upcomingTasks: current.upcomingTasks.map((item) =>
            item.id === task.id ? task : item,
          ),
        }));
        reportError(cause);
      }
    },
    [refresh, reportError, toast, update],
  );

  const addCategory = useCallback(
    async (name: string, hue: number) => {
      try {
        await apiFetch<CategoryDTO>("/api/categories", {
          method: "POST",
          body: JSON.stringify({ name, hue }),
        });
        await refresh(true);
        toast.success("Category added");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const updateCategory = useCallback(
    async (id: string, name: string, hue: number) => {
      try {
        await apiFetch(`/api/categories/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ name, hue }),
        });
        await refresh(true);
        toast.success("Category updated");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      try {
        await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
        await refresh(true);
        toast.success("Category deleted", "Its habits were kept and are now uncategorised.");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [refresh, reportError, toast],
  );

  const saveSettings = useCallback(
    async (input: SettingsInput) => {
      try {
        const result = await apiFetch<{
          user: UserDTO;
          notifications: NotificationSettingsDTO;
        }>("/api/settings", {
          method: "PATCH",
          body: JSON.stringify(input),
        });
        update((current) => ({
          ...current,
          user: result.user,
          notifications: result.notifications,
        }));
        applyTheme(result.user.theme, result.user.accentHue);
        toast.success("Settings saved", "Your preferences are synced to every device.");
        return true;
      } catch (cause) {
        reportError(cause);
        return false;
      }
    },
    [reportError, toast, update],
  );

  const deleteAccount = useCallback(async (password: string) => {
    try {
      await apiFetch("/api/auth/account", {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      await clearOfflineData();
      window.location.assign("/?deleted=1");
      return true;
    } catch (cause) {
      reportError(cause);
      return false;
    }
  }, [reportError]);

  const value = useMemo<AppContextValue>(
    () => ({
      user: data?.user ?? initialUser,
      data,
      categories: data?.categories ?? [],
      loading,
      error,
      offline,
      queueSize,
      revision,
      refresh,
      toggleStep,
      completeOccurrence,
      startTimer,
      timerAction,
      resetTimer,
      createHabit,
      updateHabit,
      archiveHabit,
      restoreHabit,
      addOccurrence,
      deleteOccurrence,
      occurrenceAction,
      createTask,
      updateTask,
      deleteTask,
      toggleTask,
      addCategory,
      updateCategory,
      deleteCategory,
      saveSettings,
      deleteAccount,
      applyThemePreview,
    }),
    [
      data,
      initialUser,
      loading,
      error,
      offline,
      queueSize,
      revision,
      refresh,
      toggleStep,
      completeOccurrence,
      startTimer,
      timerAction,
      resetTimer,
      createHabit,
      updateHabit,
      archiveHabit,
      restoreHabit,
      addOccurrence,
      deleteOccurrence,
      occurrenceAction,
      createTask,
      updateTask,
      deleteTask,
      toggleTask,
      addCategory,
      updateCategory,
      deleteCategory,
      saveSettings,
      deleteAccount,
      applyThemePreview,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used inside AppProvider");
  return context;
}
