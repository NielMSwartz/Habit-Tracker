"use client";

import { EMOJI_CHOICES, cn } from "@/lib/ui";

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
}

/** A compact emoji palette plus a free-form field for any other glyph. */
export function IconPicker({ value, onChange }: IconPickerProps) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {EMOJI_CHOICES.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => onChange(emoji)}
            className={cn(
              "grid size-9 place-items-center rounded-lg border text-lg transition-all hover:scale-105",
              value === emoji
                ? "border-accent bg-accent-soft shadow-sm"
                : "border-line bg-surface-2 hover:border-line-strong",
            )}
            aria-label={`Use ${emoji}`}
            aria-pressed={value === emoji}
          >
            {emoji}
          </button>
        ))}
      </div>
      <input
        className="input"
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, 8))}
        placeholder="Or type an emoji"
        maxLength={8}
        aria-label="Custom icon"
      />
    </div>
  );
}
