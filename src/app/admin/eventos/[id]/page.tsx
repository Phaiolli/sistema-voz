"use client";

import { use } from "react";
import { EventEditor } from "./editor";

export default function EventEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <EventEditor eventId={id === "novo" ? null : id} isNew={id === "novo"} />;
}
