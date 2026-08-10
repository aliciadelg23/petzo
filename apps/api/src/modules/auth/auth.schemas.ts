import { z } from 'zod';

// Regras de senha: 8-72 chars (bcrypt-like limit para futuros hashers), pelo menos
// 1 minúscula, 1 maiúscula, 1 dígito, 1 caractere especial.
export const passwordSchema = z
  .string()
  .min(8, 'Senha deve ter no mínimo 8 caracteres.')
  .max(72, 'Senha deve ter no máximo 72 caracteres.')
  .regex(/[a-z]/, 'Senha deve conter ao menos uma letra minúscula.')
  .regex(/[A-Z]/, 'Senha deve conter ao menos uma letra maiúscula.')
  .regex(/[0-9]/, 'Senha deve conter ao menos um dígito.')
  .regex(/[^A-Za-z0-9]/, 'Senha deve conter ao menos um caractere especial.');

export const emailSchema = z.string().email('Email inválido.').max(254);

export const registerBodySchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  name: z.string().min(1).max(120),
  phone: z.string().max(30).optional(),
});
export type RegisterBody = z.infer<typeof registerBodySchema>;

export const loginBodySchema = z.object({
  email: emailSchema,
  password: z.string().min(1).max(72),
});
export type LoginBody = z.infer<typeof loginBodySchema>;

// Shape público de um user (nunca inclui passwordHash)
export const publicUserSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullable(),
  role: z.enum(['CUSTOMER', 'STAFF', 'ADMIN']),
  emailVerifiedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
});
export type PublicUser = z.infer<typeof publicUserSchema>;

export const authSessionSchema = z.object({
  user: publicUserSchema,
  accessToken: z.string(),
  accessTokenExpiresIn: z.number().int().positive(),
});
export type AuthSession = z.infer<typeof authSessionSchema>;

export const meResponseSchema = publicUserSchema;
