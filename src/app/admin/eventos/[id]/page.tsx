import { EventEditor } from "./editor";
import { eventIncluir } from "@/lib/fixtures";

export default async function EventEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = id === eventIncluir.id || id === "new" ? eventIncluir : null;
  return <EventEditor event={event} isNew={id === "new"} />;
}
