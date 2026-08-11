import { z } from 'zod';

/** Espelha as regras da API. Mantido separado do backend para não vazar deps. */
export const passwordSchema = z
  .string()
  .min(8, 'Mínimo 8 caracteres.')
  .max(72)
  .regex(/[a-z]/, 'Precisa de ao menos uma letra minúscula.')
  .regex(/[A-Z]/, 'Precisa de ao menos uma letra maiúscula.')
  .regex(/[0-9]/, 'Precisa de ao menos um dígito.')
  .regex(/[^A-Za-z0-9]/, 'Precisa de ao menos um caractere especial.');

export const loginFormSchema = z.object({
  email: z.string().email('Email inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
});
export type LoginFormValues = z.infer<typeof loginFormSchema>;

export const registerFormSchema = z.object({
  name: z.string().min(1, 'Informe seu nome.').max(120),
  email: z.string().email('Email inválido.'),
  password: passwordSchema,
});
export type RegisterFormValues = z.infer<typeof registerFormSchema>;
