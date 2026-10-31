"use client";

import { Check } from "lucide-react";
import { HUE_PRESETS, cn } from "@/lib/ui";

interface ColorPickerProps {
  hue: number;
  onChange: (hue: number) => void;
  label?: string;
  compact?: boolean;
}

/** A continuous hue slider with a small set of quick presets. */
export function ColorPicker({
  hue,
  onChange,
  label = "Colour",
  compact = false,
}: ColorPickerProps) {
  const safe = ((Math.round(hue) % 360) + 360) % 360;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="label !mb-0">{label}</span>
        <span
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-2 py-0.5 text-[0.7rem] font-semibold text-soft"
          aria-hidden="true"
        >
          <span
            className="size-2 rounded-full"
            style={{ background: `oklch(0.68 0.2 ${safe})` }}
          />
          {safe}°
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={359}
        value={safe}
        onChange={(event) => onChange(Number(event.target.value))}
        className="hue-slider w-full cursor-pointer"
        aria-label={`${label} hue`}
      />
      {!compact ? (
        <div className="flex flex-wrap gap-1.5">
          {HUE_PRESETS.map((preset) => {
            const active = preset.hue === safe;
            return (
              <button
                key={preset.name}
                type="button"
                title={preset.name}
                aria-label={preset.name}
                aria-pressed={active}
                onClick={() => onChange(preset.hue)}
                className={cn(
                  "grid size-7 place-items-center rounded-full border-2 transition-transform hover:scale-110",
                  active ? "border-ink" : "border-transparent",
                )}
                style={{ background: `oklch(0.68 0.2 ${preset.hue})` }}
              >
                {active ? <Check className="size-3.5 text-white" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
