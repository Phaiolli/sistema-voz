import { EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";
import type { QuestionStatus } from "@/lib/types";

const config: Record<QuestionStatus, { label: string; dot: string; bg: string; text: string }> = {
  pending: {
    label: "pendente",
    dot: "hsl(25 5% 45%)",
    bg: "hsl(60 5% 93%)",
    text: "hsl(25 5% 35%)",
  },
  next: {
    label: "próxima no palco",
    dot: "hsl(var(--accent))",
    bg: "hsl(var(--accent) / .15)",
    text: "hsl(38 85% 35%)",
  },
  answered: {
    label: "respondida",
    dot: "hsl(var(--success))",
    bg: "hsl(142 71% 45% / .12)",
    text: "hsl(142 60% 28%)",
  },
  hidden: {
    label: "oculta",
    dot: "hsl(var(--muted-foreground))",
    bg: "hsl(var(--muted))",
    text: "hsl(var(--muted-foreground))",
  },
};

interface Props {
  status: QuestionStatus;
  className?: string;
}

export function StatusBadge({ status, className }: Props) {
  const c = config[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium", className)}
      style={{ background: c.bg, color: c.text }}
    >
      {status === "hidden" ? (
        <EyeOff className="size-3" aria-hidden />
      ) : (
        <span
          className="size-1.5 rounded-full flex-shrink-0"
          style={{ background: c.dot }}
          aria-hidden
        />
      )}
      {c.label}
    </span>
  );
}
