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
      <h2 className="font-bold text-[22px] mt-0 mb-5 mx-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Identidade visual</h2>
      <div className="mb-6">
        <p className="text-sm font-medium mb-3">Presets</p>
        <div className="grid grid-cols-3 gap-2.5">
          {THEME_PRESETS.map((p) => (
            <button key={p.id} onClick={() => { setPreset(p.id); setBgColor(p.bg); setAccentColor(p.accent); }} className="p-3 rounded-lg border-2 cursor-pointer text-left" style={{ borderColor: preset === p.id ? "hsl(var(--primary))" : "hsl(var(--border))", background: p.bg }}>
              <span className="block w-6 h-6 rounded-md mb-1.5" style={{ background: p.accent }} />
              <span className="text-xs font-semibold text-white">{p.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Field label="Cor de fundo" htmlFor="ev-bg">
          <div className="flex gap-2 items-center">
            <input type="color" id="ev-bg" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="w-11 h-11 rounded-lg border border-border cursor-pointer p-0.5" />
            <input value={bgColor} onChange={(e) => setBgColor(e.target.value)} style={{ ...inp, width: "auto", flex: 1 }} />
          </div>
        </Field>
        <Field label="Cor de destaque" htmlFor="ev-accent">
          <div className="flex gap-2 items-center">
            <input type="color" id="ev-accent" value={accentColor} onChange={(e) => setAccentColor(e.target.value)} className="w-11 h-11 rounded-lg border border-border cursor-pointer p-0.5" />
            <input value={accentColor} onChange={(e) => setAccentColor(e.target.value)} style={{ ...inp, width: "auto", flex: 1 }} />
          </div>
        </Field>
      </div>
      <div>
        <p className="text-sm font-medium mb-3">Preview ao vivo</p>
        <div className="rounded-xl overflow-hidden p-5 flex flex-col gap-2.5" style={{ background: bgColor }}>
          <span className="text-[32px] text-white" style={{ fontFamily: '"Archivo Black", sans-serif', letterSpacing: "-0.02em" }}>
            {name ? name.toUpperCase().slice(0, 6) : "EVENTO"}<span style={{ color: accentColor }}>.</span>
          </span>
          <div className="inline-flex gap-1.5 items-center rounded-full self-start py-1.5 px-3" style={{ background: `${accentColor}22` }}>
            <span className="w-2 h-2 rounded-full" style={{ background: accentColor }} />
            <span className="text-white text-[13px]">ao vivo · 42 participantes</span>
          </div>
          <button className="h-11 rounded-lg border-0 font-bold text-[15px] cursor-default" style={{ background: accentColor, color: "#1E4953" }}>
            Fazer uma pergunta
          </button>
        </div>
      </div>
    </div>
  );
}
