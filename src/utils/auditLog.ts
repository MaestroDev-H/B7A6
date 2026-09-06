import { prisma } from '../config/prisma';

interface AuditLogInput {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
    ipAddress?: string;
}

export async function recordAuditLog(input: AuditLogInput): Promise<void> {
    try {
        await prisma.auditLog.create({
            data: {
                userId: input.userId ?? null,
                action: input.action,
                entityType: input.entityType,
                entityId: input.entityId,
                metadata: input.metadata as any,
                ipAddress: input.ipAddress,
            },
        });
    } catch (err) {
        console.error('[audit-log] failed to record:', err);
    }
}
