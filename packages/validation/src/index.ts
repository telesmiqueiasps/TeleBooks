import { z } from "zod";

export const bookStatusSchema = z.enum([
  "want_to_read",
  "reading",
  "read",
  "paused",
  "abandoned",
]);

export const loginSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
});

export const registerSchema = z.object({
  email: z.string().email("Endereço de e-mail inválido"),
  password: z.string().min(8, "A senha deve ter no mínimo 8 caracteres"),
  username: z
    .string()
    .min(3, "Nome de usuário deve ter ao menos 3 caracteres")
    .max(30, "Nome de usuário deve ter no máximo 30 caracteres")
    .regex(/^[a-zA-Z0-9_]+$/, "Apenas letras, números e sublinhados são permitidos"),
});

export const bookCreateSchema = z.object({
  title: z.string().min(1, "O título é obrigatório"),
  subtitle: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  isbn10: z.string().length(10, "ISBN-10 deve ter 10 dígitos").optional().nullable(),
  isbn13: z.string().length(13, "ISBN-13 deve ter 13 dígitos").optional().nullable(),
  language: z.string().default("pt-BR"),
  page_count: z.number().int().positive("Número de páginas deve ser positivo").optional().nullable(),
  publication_date: z.string().optional().nullable(),
  publisher_id: z.string().uuid().optional().nullable(),
  cover_url: z.string().url("URL de capa inválida").optional().nullable(),
});

export const userBookCreateSchema = z.object({
  book_id: z.string().uuid("ID do livro inválido"),
  status: bookStatusSchema.default("want_to_read"),
  rating: z.number().min(0).max(5).optional().nullable(),
  owned: z.boolean().default(true),
  favorite: z.boolean().default(false),
  current_page: z.number().int().nonnegative().default(0),
  personal_color: z.string().optional().nullable(),
  shelf_position: z.number().int().positive().optional().nullable(),
  private_notes: z.string().optional().nullable(),
});

export const userBookUpdateSchema = userBookCreateSchema.partial().omit({ book_id: true });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type BookCreateInput = z.infer<typeof bookCreateSchema>;
export type UserBookCreateInput = z.infer<typeof userBookCreateSchema>;
export type UserBookUpdateInput = z.infer<typeof userBookUpdateSchema>;
