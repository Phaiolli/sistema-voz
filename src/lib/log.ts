/**
 * Loga um erro extraindo apenas campos seguros, sem PII.
 *
 * Nunca registra o objeto bruto de erro do Supabase (que pode conter linhas
 * com dados pessoais) nem e-mail/CPF/telefone. Apenas `message`, `code` e
 * `name` são extraídos quando presentes.
 *
 * @param context - Rótulo curto e não sensível que identifica a origem do erro.
 * @param error - Erro capturado, de tipo desconhecido.
 */
export function logError(context: string, error: unknown): void {
  const safe: { message?: string; code?: string; name?: string } = {};

  if (error instanceof Error) {
    safe.message = error.message;
    safe.name = error.name;
  } else if (typeof error === "object" && error !== null) {
    const e = error as Record<string, unknown>;
    if (typeof e.message === "string") safe.message = e.message;
    if (typeof e.name === "string") safe.name = e.name;
  } else if (typeof error === "string") {
    safe.message = error;
  }

  if (typeof error === "object" && error !== null) {
    const code = (error as Record<string, unknown>).code;
    if (typeof code === "string") safe.code = code;
  }

  console.error(context, safe);
}
