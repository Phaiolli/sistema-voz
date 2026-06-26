import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { createServerClient } from "@/lib/supabase";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Prazo de retenção de PII após o término do evento. Decorrido o prazo, os
 * dados pessoais de perguntas e inscrições de eventos encerrados são
 * anonimizados (minimização e retenção limitada — LGPD art. 15/16).
 */
const RETENTION_DAYS = 90;
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000;

const ANONYMIZED_NAME = "[removido]";

/** Máximo de updates de inscrição executados em paralelo por lote. */
const RETENTION_BATCH_SIZE = 50;

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (auth.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(auth), Buffer.from(expected));
}

/**
 * Anula `author_ip` de perguntas e inscrições com mais de 30 dias (LGPD).
 *
 * Cada execução também serve de keep-alive: o acesso ao banco impede que o
 * projeto Supabase (free tier) seja pausado por inatividade (~7 dias).
 *
 * @returns Contagem de registros anonimizados por tabela e o cutoff aplicado.
 */
async function runCleanup() {
  const cutoff = new Date(Date.now() - THIRTY_DAYS_MS).toISOString();
  const supabase = createServerClient();

  const [questionsResult, registrationsResult] = await Promise.all([
    supabase
      .from("questions")
      .update({ author_ip: null }, { count: "exact" })
      .lt("created_at", cutoff)
      .not("author_ip", "is", null),
    supabase
      .from("registrations")
      .update({ author_ip: null }, { count: "exact" })
      .lt("created_at", cutoff)
      .not("author_ip", "is", null),
  ]);

  if (questionsResult.error) throw questionsResult.error;
  if (registrationsResult.error) throw registrationsResult.error;

  const qCount = questionsResult.count ?? 0;
  const rCount = registrationsResult.count ?? 0;

  const retention = await runRetentionPurge(supabase);

  return {
    deleted: qCount + rCount,
    cutoff,
    tables: { questions: qCount, registrations: rCount },
    retention,
  };
}

/**
 * Anonimiza PII de perguntas e inscrições de eventos ENCERRADOS há mais de
 * {@link RETENTION_DAYS} dias.
 *
 * Eventos elegíveis: `status = 'ended'` cujo término (`ends_at`) já passou do
 * prazo de retenção. Queries idempotentes (filtram linhas ainda não
 * anonimizadas), então execuções repetidas não recontam nem reprocessam.
 *
 * @returns Contadores por tabela e o número de eventos elegíveis (sem PII).
 */
async function runRetentionPurge(
  supabase: ReturnType<typeof createServerClient>,
) {
  const retentionCutoff = new Date(Date.now() - RETENTION_MS).toISOString();

  const { data: endedEvents, error: eventsError } = await supabase
    .from("events")
    .select("id")
    .eq("status", "ended")
    .lt("ends_at", retentionCutoff);

  if (eventsError) throw eventsError;

  const eventIds = (endedEvents ?? []).map((e: { id: string }) => e.id);
  if (eventIds.length === 0) {
    return { eligibleEvents: 0, questions: 0, registrations: 0, retentionCutoff };
  }

  // `questions` não tem unicidade de e-mail → anonimização em massa.
  const questionsResult = await supabase
    .from("questions")
    .update(
      { author_name: ANONYMIZED_NAME, author_email: null, author_contact: null, author_ip: null },
      { count: "exact" },
    )
    .in("event_id", eventIds)
    .neq("author_name", ANONYMIZED_NAME);

  if (questionsResult.error) throw questionsResult.error;

  // `registrations.email` é NOT NULL com índice único (event_id, email): cada
  // linha recebe um e-mail-sentinela próprio para não violar a restrição.
  const { data: regs, error: regsError } = await supabase
    .from("registrations")
    .select("id")
    .in("event_id", eventIds)
    .neq("name", ANONYMIZED_NAME);

  if (regsError) throw regsError;

  const regIds = (regs ?? []).map((r: { id: string }) => r.id);

  // Processa em lotes para limitar a concorrência (evita saturar o pool de
  // conexões em eventos grandes): chunks sequenciais, paralelizando só dentro.
  for (let i = 0; i < regIds.length; i += RETENTION_BATCH_SIZE) {
    const chunk = regIds.slice(i, i + RETENTION_BATCH_SIZE);
    await Promise.all(
      chunk.map((regId) =>
        supabase
          .from("registrations")
          .update({ name: ANONYMIZED_NAME, email: `removed_${regId}@voz.app`, phone: null, document: null })
          .eq("id", regId),
      ),
    );
  }

  return {
    eligibleEvents: eventIds.length,
    questions: questionsResult.count ?? 0,
    registrations: regIds.length,
    retentionCutoff,
  };
}

/**
 * Disparado pelo Vercel Cron (que sempre usa GET) — roda a limpeza LGPD diária.
 */
export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  return NextResponse.json(await runCleanup());
}

/**
 * Mantido para invocação manual da limpeza via API.
 */
export async function DELETE(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }
  return NextResponse.json(await runCleanup());
}
