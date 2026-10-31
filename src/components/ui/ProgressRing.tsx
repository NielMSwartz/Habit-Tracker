import { cn } from "@/lib/utils";

interface ProgressRingProps {
  value: number;
  size?: number;
  stroke?: number;
  hue?: number;
  showValue?: boolean;
  label?: string;
  className?: string;
  trackClassName?: string;
}

/**
 * A small SVG progress ring. The value is a fraction between 0 and 1.
 * It intentionally avoids a chart library so it stays crisp and themeable.
 */
export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  hue = 265,
  showValue = true,
  label = "Progress",
  className,
  trackClassName,
}: ProgressRingProps) {
  const safe = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const dash = circumference * safe;
  const colour = `oklch(0.68 0.2 ${((hue % 360) + 360) % 360})`;

  return (
    <span
      className={cn("relative inline-grid shrink-0 place-items-center", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${label}: ${Math.round(safe * 100)}%`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={stroke}
          className={cn("stroke-current text-surface-3", trackClassName)}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={colour}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{
            transition: "stroke-dasharray 500ms cubic-bezier(0.22,1,0.36,1)",
            filter: `drop-shadow(0 0 5px oklch(0.68 0.2 ${hue} / 0.35))`,
          }}
        />
      </svg>
      {showValue ? (
        <span className="absolute text-[0.68rem] font-bold tabular-nums text-ink">
          {Math.round(safe * 100)}%
        </span>
      ) : null}
    </span>
  );
}
