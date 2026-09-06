import { z } from 'zod';

export const createPropertySchema = z.object({
    body: z.object({
        title: z.string().min(3),
        description: z.string().optional(),
        type: z.enum(['APARTMENT', 'HOUSE', 'STUDIO', 'DORMITORY']).default('APARTMENT'),
        address: z.string().min(3),
        city: z.string().min(2),
        area: z.string().optional(),
        amenities: z.array(z.string()).optional(),
        images: z.array(z.string().url()).optional(),
    }),
});

export const updatePropertySchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        title: z.string().min(3).optional(),
        description: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        area: z.string().optional(),
        amenities: z.array(z.string()).optional(),
        images: z.array(z.string().url()).optional(),
        isPublished: z.boolean().optional(),
    }),
});

export const listPropertiesQuerySchema = z.object({
    query: z.object({
        page: z.string().optional(),
        limit: z.string().optional(),
        city: z.string().optional(),
        type: z.enum(['APARTMENT', 'HOUSE', 'STUDIO', 'DORMITORY']).optional(),
        minRent: z.string().optional(),
        maxRent: z.string().optional(),
        sortBy: z.string().optional(),
        order: z.enum(['asc', 'desc']).optional(),
        search: z.string().optional(),
    }),
});
