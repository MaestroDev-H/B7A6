import app from './app';
import { env } from './config/env';
import { prisma } from './config/prisma';

async function bootstrap() {
    try {
        await prisma.$connect();
        console.log('Connected to PostgreSQL via Prisma');

        const server = app.listen(env.port, () => {
            console.log(`Server running on http://localhost:${env.port}/api/${env.apiVersion}`);
        });

        const shutdown = async (signal: string) => {
            console.log(`\n${signal} received. Shutting down gracefully...`);
            server.close(async () => {
                await prisma.$disconnect();
                process.exit(0);
            });
        };

        process.on('SIGINT', () => shutdown('SIGINT'));
        process.on('SIGTERM', () => shutdown('SIGTERM'));
    } catch (err) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
    }
}

bootstrap();
