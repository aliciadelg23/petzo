import { z } from 'zod';

export const checkoutFormSchema = z.object({
  label: z.string().min(1, 'Informe o rótulo (ex.: Casa).').max(60),
  street: z.string().min(1, 'Informe a rua.').max(200),
  number: z.string().min(1, 'Informe o número.').max(20),
  complement: z.string().max(60).optional(),
  district: z.string().min(1, 'Informe o bairro.').max(120),
  city: z.string().min(1, 'Informe a cidade.').max(120),
  state: z
    .string()
    .length(2, 'UF deve ter 2 caracteres.')
    .transform((v) => v.toUpperCase()),
  zip: z
    .string()
    .regex(/^\d{5}-?\d{3}$/, 'CEP inválido (formato 12345-678).'),
  couponCode: z.string().trim().max(60).optional(),
});
export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;
