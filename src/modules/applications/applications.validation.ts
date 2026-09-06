import { z } from 'zod';

export const createApplicationSchema = z.object({
    body: z.object({
        roomId: z.string().uuid(),
        moveInDate: z.string().datetime(),
        message: z.string().optional(),
    }),
});

export const reviewApplicationSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        status: z.enum(['APPROVED', 'REJECTED']),
    }),
});
