export function MedTab({ label, count, active, onClick }: { label: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        padding: "12px 14px", marginBottom: -1,
        border: "none", borderBottom: active ? "2px solid hsl(var(--primary))" : "2px solid transparent",
        background: "transparent", cursor: "pointer",
        fontSize: 14, fontWeight: active ? 600 : 500,
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        flexShrink: 0, whiteSpace: "nowrap",
      }}
    >
      {label}
      <span style={{
        fontSize: 11, padding: "1px 6px", borderRadius: 10,
        background: active ? "hsl(var(--primary) / .12)" : "hsl(var(--muted))",
        color: active ? "hsl(var(--primary))" : "hsl(var(--muted-foreground))",
        fontVariantNumeric: "tabular-nums",
      }}>
        {count}
      </span>
    </button>
  );
}
