import { z } from "zod";

export const submitQuestionSchema = z.object({
  authorName: z
    .string()
    .min(2, "Nome muito curto.")
    .max(100, "Nome muito longo."),
  authorContact: z
    .string()
    .min(5, "Informe email ou telefone.")
    .max(200, "Contato muito longo."),
  text: z
    .string()
    .min(10, "Pergunta muito curta.")
    .max(500, "Pergunta muito longa."),
  lgpdAccepted: z
    .boolean()
    .refine((v) => v === true, "É preciso aceitar os termos LGPD."),
});

export const patchQuestionSchema = z.object({
  action: z.enum(["setNext", "markAnswered", "hide", "restore"]),
});

export type SubmitQuestionBody = z.infer<typeof submitQuestionSchema>;
export type PatchQuestionBody = z.infer<typeof patchQuestionSchema>;
