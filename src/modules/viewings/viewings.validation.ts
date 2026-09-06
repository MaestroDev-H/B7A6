import { z } from 'zod';

export const createViewingSchema = z.object({
    body: z.object({
        roomId: z.string().uuid(),
        requestedDate: z.string().datetime(),
        note: z.string().optional(),
    }),
});

export const updateViewingStatusSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        status: z.enum(['APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED']),
    }),
});
