import { z } from "zod";

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

export const patchQuestionSchema = z.object({
  action: z.enum(["setNext", "markAnswered", "hide", "restore"]),
});

export type SubmitQuestionBody = z.infer<typeof submitQuestionSchema>;
export type PatchQuestionBody = z.infer<typeof patchQuestionSchema>;

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
export const patchEventSchema = createEventSchema.partial();

export const createUserSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(100),
  email: z.string().email("E-mail inválido."),
  password: z.string()
    .min(8, "Senha mínima: 8 caracteres.")
    .regex(/[A-Z]/, "Senha: ao menos uma letra maiúscula.")
    .regex(/[0-9]/, "Senha: ao menos um número."),
  role: z.enum(["admin", "mediador", "owner"]),
});
export const patchUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  password: z.string().min(8).regex(/[A-Z]/).regex(/[0-9]/).optional(),
  role: z.enum(["admin", "mediador", "owner"]).optional(),
});

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

export const assignMediatorSchema = z.object({
  userId: z.string().min(1, "userId obrigatório."),
});

export const createRegistrationSchema = z.object({
  name: z.string().min(2, "Nome muito curto.").max(120, "Nome muito longo."),
  email: z.string().email("E-mail inválido."),
  phone: z.string().max(20).optional(),
  document: z.string().max(20).optional(),
  lgpdAccepted: z.boolean().refine((v) => v === true, "É preciso aceitar os termos LGPD."),
});

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
