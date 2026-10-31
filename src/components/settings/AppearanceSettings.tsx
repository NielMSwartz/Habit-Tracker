"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Monitor, Moon, Palette, RotateCcw, Sun } from "lucide-react";
import { useApp } from "@/components/providers/AppProvider";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { SectionCard } from "@/components/ui/SectionCard";
import { Segmented } from "@/components/ui/Segmented";
import { Spinner } from "@/components/ui/Spinner";
import type { ThemePreference } from "@/lib/types";

const BRAND_HUE = 265;

/** Theme mode and accent hue, with an instant live preview. */
export function AppearanceSettings() {
  const { user, saveSettings, applyThemePreview } = useApp();
  const [theme, setTheme] = useState<ThemePreference>(user.theme);
  const [accentHue, setAccentHue] = useState(user.accentHue);
  const [saving, setSaving] = useState(false);

  // Remember the committed values so leaving without saving restores them.
  const savedTheme = useRef(user.theme);
  const savedHue = useRef(user.accentHue);
  useEffect(() => {
    savedTheme.current = user.theme;
    savedHue.current = user.accentHue;
  }, [user.theme, user.accentHue]);
  useEffect(
    () => () => applyThemePreview(savedTheme.current, savedHue.current),
    [applyThemePreview],
  );

  const dirty = theme !== user.theme || accentHue !== user.accentHue;

  const chooseTheme = (next: ThemePreference) => {
    setTheme(next);
    applyThemePreview(next, accentHue);
  };

  const chooseHue = (next: number) => {
    setAccentHue(next);
    applyThemePreview(theme, next);
  };

  const save = async () => {
    setSaving(true);
    const ok = await saveSettings({ theme, accentHue });
    setSaving(false);
    if (!ok) applyThemePreview(savedTheme.current, savedHue.current);
  };

  return (
    <SectionCard
      title="Appearance"
      description="Pick a light, dark or system theme and make the accent yours."
      eyebrow="Look & feel"
      action={
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={() => chooseHue(BRAND_HUE)}
          disabled={accentHue === BRAND_HUE}
        >
          <RotateCcw className="size-3.5" /> Brand colour
        </button>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="label">Theme</p>
          <Segmented
            value={theme}
            onChange={chooseTheme}
            ariaLabel="Colour theme"
            className="w-full sm:w-auto"
            options={[
              { value: "light", label: "Light", icon: Sun },
              { value: "dark", label: "Dark", icon: Moon },
              { value: "system", label: "System", icon: Monitor },
            ]}
          />
          <p className="field-hint">
            System follows your device appearance and switches automatically.
          </p>
        </div>

        <ColorPicker hue={accentHue} onChange={chooseHue} label="Accent colour" />

        <div
          className="rounded-2xl border border-line bg-surface-2/50 p-3"
          aria-label="Appearance preview"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="grid size-9 place-items-center rounded-xl text-white"
              style={{ background: "var(--brand-gradient)" }}
              aria-hidden="true"
            >
              <Palette className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-ink">A vivid little preview</p>
              <p className="text-[0.65rem] text-muted">
                Buttons, charts and progress rings all follow your accent.
              </p>
            </div>
            <span className="btn btn-primary btn-sm pointer-events-none" aria-hidden="true">
              <Check className="size-3.5" /> Primary
            </span>
            <span className="chip" aria-hidden="true">
              Accent chip
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-[0.7rem] text-faint">
            Reduced-motion preferences are always respected.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={save}
            disabled={saving || !dirty}
          >
            {saving ? <Spinner size={15} /> : <Check className="size-4" />}
            Save appearance
          </button>
        </div>
      </div>
    </SectionCard>
  );
}
