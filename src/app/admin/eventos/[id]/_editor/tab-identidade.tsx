import { Field, inp } from "./shared";

const THEME_PRESETS = [
  { id: "incluir", label: "INCLUIR", bg: "#1E4953", accent: "#F2B33D" },
  { id: "voz-base", label: "voz. base", bg: "#ffffff", accent: "#7C7AE8" },
  { id: "warmth", label: "Warmth", bg: "#3D1F0A", accent: "#F2923D" },
  { id: "mono", label: "Mono", bg: "#141414", accent: "#FFFFFF" },
  { id: "lake", label: "Lake", bg: "#0E2B3D", accent: "#4DBFB8" },
  { id: "vine", label: "Vine", bg: "#1A2E1A", accent: "#7EC85E" },
];

interface TabIdentidadeProps {
  name: string;
  accentColor: string;
  setAccentColor: (v: string) => void;
  bgColor: string;
  setBgColor: (v: string) => void;
  preset: string;
  setPreset: (v: string) => void;
}

export function TabIdentidade({ name, accentColor, setAccentColor, bgColor, setBgColor, preset, setPreset }: TabIdentidadeProps) {
  return (
    <div style={{ maxWidth: 700 }}>
      <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: "0 0 20px" }}>Identidade visual</h2>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Presets</p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
          {THEME_PRESETS.map((p) => (
            <button key={p.id} onClick={() => { setPreset(p.id); setBgColor(p.bg); setAccentColor(p.accent); }} style={{ padding: 12, borderRadius: 10, border: "2px solid", borderColor: preset === p.id ? "hsl(var(--primary))" : "hsl(var(--border))", cursor: "pointer", background: p.bg, textAlign: "left" }}>
              <span style={{ display: "block", width: 24, height: 24, borderRadius: 6, background: p.accent, marginBottom: 6 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: "#fff" }}>{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Field label="Cor de fundo" htmlFor="ev-bg">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" id="ev-bg" value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", padding: 2 }} />
            <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ ...inp, width: "auto", flex: 1 }} />
          </div>
        </Field>
        <Field label="Cor de destaque" htmlFor="ev-accent">
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="color" id="ev-accent" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ width: 44, height: 44, borderRadius: 8, border: "1px solid hsl(var(--border))", cursor: "pointer", padding: 2 }} />
            <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ ...inp, width: "auto", flex: 1 }} />
          </div>
        </Field>
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 500, marginBottom: 12 }}>Preview ao vivo</p>
        <div style={{ borderRadius: 12, overflow: "hidden", background: bgColor, padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
          <span style={{ fontFamily: '"Archivo Black", sans-serif', fontSize: 32, color: "#fff", letterSpacing: "-0.02em" }}>
            {name ? name.toUpperCase().slice(0, 6) : "EVENTO"}<span style={{ color: accentColor }}>.</span>
          </span>
          <div style={{ display: "inline-flex", gap: 6, alignItems: "center", background: `${accentColor}22`, padding: "6px 12px", borderRadius: 999, alignSelf: "flex-start" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: accentColor }} />
            <span style={{ color: "#fff", fontSize: 13 }}>ao vivo · 42 participantes</span>
          </div>
          <button style={{ height: 44, borderRadius: 8, border: "none", background: accentColor, color: "#1E4953", fontWeight: 700, fontSize: 15, cursor: "default" }}>
            Fazer uma pergunta
          </button>
        </div>
      </div>
    </div>
  );
}
