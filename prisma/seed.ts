import { PrismaClient, Role, PropertyType, RoomStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS || 12);

    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@12345', saltRounds);
    const admin = await prisma.user.upsert({
        where: { email: process.env.ADMIN_EMAIL || 'admin@housing.com' },
        update: {},
        create: {
            name: 'Platform Admin',
            email: process.env.ADMIN_EMAIL || 'admin@housing.com',
            password: adminPassword,
            role: Role.ADMIN,
            isVerified: true,
        },
    });

    const ownerPassword = await bcrypt.hash('Owner@12345', saltRounds);
    const owner = await prisma.user.upsert({
        where: { email: 'owner@housing.com' },
        update: {},
        create: {
            name: 'Demo Owner',
            email: 'owner@housing.com',
            password: ownerPassword,
            role: Role.OWNER,
            isVerified: true,
        },
    });

    const tenantPassword = await bcrypt.hash('Tenant@12345', saltRounds);
    const tenant = await prisma.user.upsert({
        where: { email: 'tenant@housing.com' },
        update: {},
        create: {
            name: 'Demo Tenant',
            email: 'tenant@housing.com',
            password: tenantPassword,
            role: Role.TENANT,
            isVerified: true,
        },
    });

    const property = await prisma.property.create({
        data: {
            ownerId: owner.id,
            title: 'Green Valley Residence',
            description: 'A quiet shared apartment near the university.',
            type: PropertyType.APARTMENT,
            address: '12 Valley Road',
            city: 'Sylhet',
            area: 'Zindabazar',
            amenities: ['WiFi', 'Parking', 'Laundry'],
            rooms: {
                create: [
                    {
                        roomNumber: 'A-101',
                        capacity: 2,
                        rentAmount: 150,
                        depositAmount: 150,
                        status: RoomStatus.AVAILABLE,
                    },
                    {
                        roomNumber: 'A-102',
                        capacity: 1,
                        rentAmount: 220,
                        depositAmount: 220,
                        status: RoomStatus.AVAILABLE,
                    },
                ],
            },
        },
    });

    console.log('✅ Seed complete');
    console.log({ admin: admin.email, owner: owner.email, tenant: tenant.email, property: property.title });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
