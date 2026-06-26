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
    <div className="flex flex-col gap-5" style={{ maxWidth: 600 }}>
      <h2 className="font-bold text-[22px] m-0" style={{ fontFamily: '"Archivo", sans-serif' }}>Informações gerais</h2>
      <Field label="Nome do evento" htmlFor="ev-name">
        <input id="ev-name" value={name} onChange={(e) => setName(e.target.value)} style={inp} />
      </Field>
      <Field label="Slug (URL)" htmlFor="ev-slug">
        <input id="ev-slug" value={slug} onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} style={inp} />
        <p className="text-xs text-muted-foreground mt-1 mb-0 mx-0">voz.app/e/{slug || "slug-do-evento"}</p>
      </Field>
      <div className="grid grid-cols-2 gap-4">
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
