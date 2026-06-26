import { z } from "zod";

/**
 * Validates payload when a participant submits a question to an event.
 * Enforces LGPD acceptance and basic content rules.
 */
export const submitQuestionSchema = z.object({
  authorName: z
    .string()
    .min(2, "Nome muito curto.")
    .max(100, "Nome muito longo."),
  authorContact: z
    .string()
    .min(5, "Informe seu WhatsApp.")
    .max(200, "Contato muito longo."),
  authorEmail: z
    .string()
    .email("E-mail inválido.")
    .max(200, "E-mail muito longo.")
    .optional()
    .or(z.literal("")),
  text: z
    .string()
    .min(10, "Pergunta muito curta.")
    .max(500, "Pergunta muito longa."),
  lgpdAccepted: z
    .boolean()
    .refine((v) => v === true, "É preciso aceitar os termos LGPD."),
  anonymous: z.boolean().optional(),
});

/**
 * Validates moderation action on a question (mediator/admin only).
 */
export const patchQuestionSchema = z.object({
  action: z.enum(["setNext", "markAnswered", "hide", "restore"]),
});

export type SubmitQuestionBody = z.infer<typeof submitQuestionSchema>;
export type PatchQuestionBody = z.infer<typeof patchQuestionSchema>;

/**
 * Validates payload when creating a new event.
 * Owners and admins can create events; subjects to plan limits.
 */
export const createEventSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(120, "Nome muito longo."),
  slug: z.string().min(2).max(60).regex(/^[a-z0-9-]+$/, "Slug: apenas letras minúsculas, números e hífens."),
  startsAt: z.string().min(1, "Data de início obrigatória."),
  endsAt: z.string().min(1, "Data de término obrigatória."),
  place: z.string().min(2, "Local muito curto.").max(120),
  address: z.string().max(200).default(""),
  status: z.enum(["draft", "active", "ended"]).default("draft"),
  about: z.string().max(2000).default(""),
  theme: z.record(z.string(), z.unknown()).default({}),
  config: z.record(z.string(), z.unknown()).default({}),
});
/**
 * Validates partial event update payload (all fields optional).
 */
export const patchEventSchema = createEventSchema.partial();

/**
 * Validates payload when creating a new user (admin endpoint).
 *
 * Note: `superadmin` is intentionally NOT allowed here — it can only be set
 * through seed or manual database operations (see ADR 007 for the security rationale).
 * The `UserRole` type includes `superadmin` for type safety when *reading* users,
 * but creation is restricted to prevent privilege escalation (BFLA mitigation).
 */
export const createUserSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(100),
  email: z.string().email("E-mail inválido."),
  password: z.string()
    .min(8, "Senha mínima: 8 caracteres.")
    .regex(/[A-Z]/, "Senha: ao menos uma letra maiúscula.")
    .regex(/[0-9]/, "Senha: ao menos um número."),
  role: z.enum(["admin", "mediador", "owner"]),
});
/**
 * Validates partial user update payload (all fields optional).
 */
export const patchUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional(),
  role: z.enum(["admin", "mediador", "owner"]).optional(),
});

/**
 * Validates payload when a new owner registers via public registration form.
 * Creates a user with role "owner" (not "admin" or "mediador").
 */
export const registerSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(100),
  email: z.string().email("E-mail inválido."),
  password: z
    .string()
    .min(8, "Senha mínima: 8 caracteres.")
    .regex(/[A-Z]/, "Ao menos uma letra maiúscula.")
    .regex(/[0-9]/, "Ao menos um número."),
  lgpdAccepted: z.boolean().refine((v) => v === true, "Aceite os termos LGPD para continuar."),
});
export type RegisterBody = z.infer<typeof registerSchema>;

/**
 * Validates payload when assigning a mediator to an event.
 */
export const assignMediatorSchema = z.object({
  userId: z.string().min(1, "userId obrigatório."),
});

/**
 * Validates payload when a participant registers/inscribes in an event.
 */
export const createRegistrationSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(120, "Nome muito longo."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().max(20).optional(),
  document: z.string().max(20).optional(),
  lgpdAccepted: z.boolean().refine((v) => v === true, "É preciso aceitar os termos LGPD."),
});

/**
 * Validates payload when updating a registration (check-in, kit delivery, etc.).
 */
export const patchRegistrationSchema = z.object({
  checkedIn: z.boolean().optional(),
  kitDelivered: z.boolean().optional(),
});

export type CreateEventBody = z.infer<typeof createEventSchema>;
export type PatchEventBody = z.infer<typeof patchEventSchema>;
export type CreateUserBody = z.infer<typeof createUserSchema>;
export type PatchUserBody = z.infer<typeof patchUserSchema>;
export type AssignMediatorBody = z.infer<typeof assignMediatorSchema>;
export type CreateRegistrationBody = z.infer<typeof createRegistrationSchema>;
export type PatchRegistrationBody = z.infer<typeof patchRegistrationSchema>;

/**
 * Shape of the public question payload sent over Realtime broadcasts, aligned
 * with `mapQuestionPublic`. Clients MUST validate incoming broadcast payloads
 * with this schema before trusting them — the channel is signed with the anon
 * key, so any subscriber could publish a forged message.
 */
export const questionBroadcastSchema = z.object({
  id: z.string().min(1),
  eventId: z.string().min(1),
  text: z.string(),
  isAnonymous: z.boolean(),
  authorName: z.string(),
  status: z.enum(["pending", "next", "answered", "hidden"]),
  createdAt: z.string(),
});
export type QuestionBroadcast = z.infer<typeof questionBroadcastSchema>;

/** Payload of a `question:deleted` broadcast (only the id is needed). */
export const questionDeletedBroadcastSchema = z.object({
  id: z.string().min(1),
});
export type QuestionDeletedBroadcast = z.infer<typeof questionDeletedBroadcastSchema>;
