import { z } from 'zod';

export const updateProfileSchema = z.object({
    body: z.object({
        name: z.string().min(2).optional(),
        phone: z.string().optional(),
        avatar: z.string().url().optional(),
    }),
});

export const updateUserRoleSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        role: z.enum(['ADMIN', 'OWNER', 'TENANT']),
    }),
});

export const listUsersQuerySchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        role: z.enum(['ADMIN', 'OWNER', 'TENANT']).optional(),
        search: z.string().optional(),
    }),
});
