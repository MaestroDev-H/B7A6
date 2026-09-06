import { z } from 'zod';

export const endTenancySchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        endDate: z.string().datetime().optional(),
    }),
});

export const generateInvoiceSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        type: z.enum(['RENT', 'UTILITY']),
        amount: z.number().positive().optional(),
        dueDate: z.string().datetime(),
    }),
});
