import { prisma } from '../../config/prisma';
import { AppError } from '../../utils/AppError';

export const RoommateService = {
    async upsertPreference(tenantId: string, data: any) {
        return prisma.roommatePreference.upsert({
            where: { tenantId },
            update: data,
            create: { ...data, tenantId },
        });
    },

    async myPreference(tenantId: string) {
        const pref = await prisma.roommatePreference.findUnique({ where: { tenantId } });
        if (!pref) throw new AppError(404, 'No roommate preference set yet.');
        return pref;
    },

    // Matching algorithm: given the current tenant's preference, find other
    // tenants with overlapping budget range, same city, and shared lifestyle
    // tags. Score = tag overlap count + budget-range closeness.
    async findMatches(tenantId: string) {
        const mine = await prisma.roommatePreference.findUnique({ where: { tenantId } });
        if (!mine) throw new AppError(400, 'Set your roommate preference before searching for matches.');

        const candidates = await prisma.roommatePreference.findMany({
            where: {
                tenantId: { not: tenantId },
                preferredCity: { equals: mine.preferredCity, mode: 'insensitive' },
                budgetMin: { lte: mine.budgetMax },
                budgetMax: { gte: mine.budgetMin },
            },
            include: { tenant: { select: { id: true, name: true, avatar: true } } },
        });

        const scored = candidates.map((c) => {
            const sharedTags = c.lifestyleTags.filter((t) => mine.lifestyleTags.includes(t));
            const budgetOverlap =
                Math.min(Number(mine.budgetMax), Number(c.budgetMax)) - Math.max(Number(mine.budgetMin), Number(c.budgetMin));
            const score = sharedTags.length * 10 + Math.max(0, budgetOverlap) / 10;
            return { ...c, matchScore: Number(score.toFixed(2)), sharedTags };
        });

        return scored.sort((a, b) => b.matchScore - a.matchScore);
    },

    // Room-level matching: rooms in the preferred city within budget that still
    // have a free slot (currentOccupancy < capacity).
    async findMatchingRooms(tenantId: string) {
        const mine = await prisma.roommatePreference.findUnique({ where: { tenantId } });
        if (!mine) throw new AppError(400, 'Set your roommate preference before searching for rooms.');

        return prisma.room.findMany({
            where: {
                deletedAt: null,
                status: 'AVAILABLE',
                rentAmount: { gte: mine.budgetMin, lte: mine.budgetMax },
                property: { deletedAt: null, isPublished: true, city: { equals: mine.preferredCity, mode: 'insensitive' } },
            },
            include: { property: true },
            orderBy: { rentAmount: 'asc' },
        });
    },
};
