import { z } from 'zod';

export const initiatePaymentSchema = z.object({
    body: z.object({
        invoiceId: z.string().uuid(),
    }),
});
