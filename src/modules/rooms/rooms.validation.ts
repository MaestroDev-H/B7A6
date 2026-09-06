import { z } from 'zod';

export const createRoomSchema = z.object({
    params: z.object({ propertyId: z.string().uuid() }),
    body: z.object({
        roomNumber: z.string().min(1),
        capacity: z.number().int().min(1).default(1),
        rentAmount: z.number().positive(),
        depositAmount: z.number().nonnegative().default(0),
        description: z.string().optional(),
        images: z.array(z.string().url()).optional(),
    }),
});

export const updateRoomSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        rentAmount: z.number().positive().optional(),
        depositAmount: z.number().nonnegative().optional(),
        capacity: z.number().int().min(1).optional(),
        description: z.string().optional(),
        status: z.enum(['AVAILABLE', 'OCCUPIED', 'UNDER_MAINTENANCE', 'INACTIVE']).optional(),
    }),
});
