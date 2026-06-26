import { Field, inp } from "./shared";

interface TabGeralProps {
  name: string;
  setName: (v: string) => void;
  slug: string;
  setSlug: (v: string) => void;
  startsAt: string;
  setStartsAt: (v: string) => void;
  endsAt: string;
  setEndsAt: (v: string) => void;
  place: string;
  setPlace: (v: string) => void;
  address: string;
  setAddress: (v: string) => void;
}

export function TabGeral({ name, setName, slug, setSlug, startsAt, setStartsAt, endsAt, setEndsAt, place, setPlace, address, setAddress }: TabGeralProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 600 }}>
      <h2 style={{ fontFamily: '"Archivo", sans-serif', fontWeight: 700, fontSize: 22, margin: 0 }}>Informações gerais</h2>
      <Field label="Nome do evento" htmlFor="ev-name">
        <input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} style={inp} />
      </Field>
      <Field label="Slug (URL)" htmlFor="ev-slug">
        <input id="ev-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} style={inp} />
        <p style={{ fontSize: 12, color: "hsl(var(--muted-foreground))", margin: "4px 0 0" }}>voz.app/e/{slug || "slug-do-evento"}</p>
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Field label="Início" htmlFor="ev-start">
          <input id="ev-start" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} style={inp} />
        </Field>
        <Field label="Término" htmlFor="ev-end">
          <input id="ev-end" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} style={inp} />
        </Field>
      </div>
      <Field label="Local" htmlFor="ev-place">
        <input id="ev-place" value={place} onChange={(e) => setPlace(e.target.value)} style={inp} />
      </Field>
      <Field label="Endereço completo" htmlFor="ev-address">
        <input id="ev-address" value={address} onChange={(e) => setAddress(e.target.value)} style={inp} />
      </Field>
    </div>
  );
}
