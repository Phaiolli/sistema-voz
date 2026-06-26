import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  inverse?: boolean;
  className?: string;
}

export function VozWordmark({ size = 24, inverse = false, className }: Props) {
  return (
    <span
      className={cn("voz-wordmark inline-flex items-baseline", className)}
      style={{
        fontSize: size,
        color: inverse ? "#fff" : "hsl(var(--foreground))",
      }}
      aria-label="voz."
    >
      voz
      <span className="text-accent">.</span>
    </span>
  );
}

export function VozMonogram({ size = 32 }: { size?: number }) {
  return (
    <span
      aria-label="voz."
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground leading-none"
      style={{
        width: size,
        height: size,
        fontFamily: '"Archivo Black", sans-serif',
        fontWeight: 900,
        fontSize: size * 0.45,
        letterSpacing: "-0.02em",
      }}
    >
      v.
    </span>
  );
}

interface LockupProps {
  eventName: string;
  size?: number;
  inverse?: boolean;
  className?: string;
}

export function VozLockup({ eventName, size = 16, inverse = false, className }: LockupProps) {
  return (
    <div
      className={cn("inline-flex items-center gap-2", className)}
      aria-label={`voz. | ${eventName}`}
    >
      <VozWordmark size={size} inverse={inverse} />
      <span
        style={{
          width: 1,
          height: size * 1.4,
          background: inverse ? "rgba(255,255,255,0.3)" : "hsl(var(--border))",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontFamily: '"Archivo Black", sans-serif',
          fontWeight: 900,
          fontSize: size * 0.85,
          letterSpacing: "-0.01em",
          color: inverse ? "#fff" : "hsl(var(--foreground))",
        }}
      >
        {eventName}
      </span>
    </div>
  );
}
