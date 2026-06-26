export function MedTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3.5 py-3 -mb-px cursor-pointer border-0 text-sm shrink-0 whitespace-nowrap bg-transparent ${
        active ? "font-semibold text-primary" : "font-medium text-muted-foreground"
      }`}
      style={{
        borderBottom: active ? "2px solid hsl(var(--primary))" : "2px solid transparent",
      }}
    >
      {label}
      <span
        className={`text-[11px] px-1.5 py-px rounded-[10px] ${
          active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        }`}
        style={{ fontVariantNumeric: "tabular-nums" }}
      >
        {count}
      </span>
    </button>
  );
}
