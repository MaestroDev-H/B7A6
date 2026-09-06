import { z } from 'zod';

export const upsertPreferenceSchema = z.object({
    body: z.object({
        budgetMin: z.number().nonnegative(),
        budgetMax: z.number().positive(),
        preferredCity: z.string().min(2),
        preferredArea: z.string().optional(),
        genderPref: z.string().optional(),
        lifestyleTags: z.array(z.string()).optional(),
        moveInFrom: z.string().datetime().optional(),
        bio: z.string().optional(),
    }).refine((d) => d.budgetMax >= d.budgetMin, {
        message: 'budgetMax must be greater than or equal to budgetMin',
        path: ['budgetMax'],
    }),
});
