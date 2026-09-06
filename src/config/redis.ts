import Redis from 'ioredis';
import { env } from './env';

export const redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    lazyConnect: true,
});

redis.on('error', (err) => {
    console.warn('[redis] connection issue (continuing without cache):', err.message);
});

export async function cacheGet<T>(key: string): Promise<T | null> {
    try {
        const val = await redis.get(key);
        return val ? (JSON.parse(val) as T) : null;
    } catch {
        return null;
    }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 60): Promise<void> {
    try {
        await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
        // best-effort cache
    }
}

export async function cacheDel(pattern: string): Promise<void> {
    try {
        const keys = await redis.keys(pattern);
        if (keys.length) await redis.del(...keys);
    } catch {
        // ignore
    }
}
