import { createServerClient } from "@/lib/supabase";

/**
 * Exporta todos os dados PII do owner e seus eventos/participantes.
 * @param ownerId - ID do usuário owner
 * @returns JSON estruturado com todos os dados PII do owner
 */
export async function exportOwnerData(ownerId: string): Promise<object> {
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from("users")
    .select("id, name, email, role, created_at, last_seen_at")
    .eq("id", ownerId)
    .maybeSingle();

  const { data: events } = await supabase
    .from("events")
    .select("*")
    .eq("organizer_id", ownerId);

  const eventIds = (events ?? []).map((e: { id: string }) => e.id);

  const { data: participants } =
    eventIds.length > 0
      ? await supabase
          .from("participants")
          .select("*")
          .in("event_id", eventIds)
      : { data: [] };

  const { data: registrations } =
    eventIds.length > 0
      ? await supabase
          .from("registrations")
          .select("*")
          .in("event_id", eventIds)
      : { data: [] };

  return {
    exportedAt: new Date().toISOString(),
    user: user ?? null,
    events: events ?? [],
    participants: participants ?? [],
    registrations: registrations ?? [],
  };
}

/**
 * Anonimiza PII de participantes de todos os eventos do owner.
 * Mantém dados fiscais (pagamentos) intactos.
 * @param ownerId - ID do usuário owner
 */
export async function anonymizeOwnerData(ownerId: string): Promise<void> {
  const supabase = createServerClient();

  const { data: events } = await supabase
    .from("events")
    .select("id")
    .eq("organizer_id", ownerId);

  const eventIds = (events ?? []).map((e: { id: string }) => e.id);

  await supabase
    .from("users")
    .update({
      name: "Conta Removida",
      email: `removed_${ownerId}@voz.app`,
    })
    .eq("id", ownerId);

  if (eventIds.length > 0) {
    await supabase
      .from("participants")
      .update({ name: "Anônimo", contact: "" })
      .in("event_id", eventIds);

    // Fetch registration ids first to build unique anonymized emails and avoid
    // violating the (event_id, email) unique index when multiple registrations
    // exist within the same event.
    const { data: regs } = await supabase
      .from("registrations")
      .select("id")
      .in("event_id", eventIds);

    if (regs && regs.length > 0) {
      await Promise.all(
        (regs as { id: string }[]).map((reg) =>
          supabase
            .from("registrations")
            .update({
              name: "Anônimo",
              email: `removed_${reg.id}@voz.app`,
              phone: null,
              document: null,
            })
            .eq("id", reg.id),
        ),
      );
    }

    await supabase
      .from("questions")
      .update({
        author_name: "Anônimo",
        author_contact: null,
        author_email: null,
        author_ip: null,
      })
      .in("event_id", eventIds);
  }
}
