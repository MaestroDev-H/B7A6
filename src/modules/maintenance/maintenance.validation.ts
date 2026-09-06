import { z } from 'zod';

export const createMaintenanceSchema = z.object({
    body: z.object({
        tenancyId: z.string().uuid(),
        title: z.string().min(3),
        description: z.string().min(5),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        images: z.array(z.string().url()).optional(),
    }),
});

export const updateMaintenanceStatusSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        status: z.enum(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']),
    }),
});
