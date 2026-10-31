import { cn } from "@/lib/utils";

interface SectionCardProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  eyebrow?: string;
}

/** A titled panel used to group related content on every screen. */
export function SectionCard({
  title,
  description,
  action,
  children,
  className,
  bodyClassName,
  eyebrow,
}: SectionCardProps) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title || action ? (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
          <div className="min-w-0">
            {eyebrow ? (
              <p className="mb-0.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-accent">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="text-base font-bold text-ink sm:text-lg">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
        </header>
      ) : null}
      <div className={cn("p-4 sm:p-5", bodyClassName)}>{children}</div>
    </section>
  );
}
