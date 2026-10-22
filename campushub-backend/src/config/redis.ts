// src/config/redis.ts
import Redis from 'ioredis';
import { logger } from './logger';

let redisClient: Redis | null = null;

export const connectRedis = async (): Promise<void> => {
  const url = process.env.REDIS_URL || 'redis://localhost:6379';

  redisClient = new Redis(url, {
    retryStrategy: (times) => {
      if (times > 5) {
        logger.warn('Redis unavailable — caching disabled');
        return null; // stop retrying
      }
      return Math.min(times * 100, 2000);
    },
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  redisClient.on('connect', () => logger.info('✅ Redis connected'));
  redisClient.on('error', (err) => logger.warn(`Redis error: ${err.message}`));

  try {
    await redisClient.connect();
  } catch {
    logger.warn('Redis not available — running without cache');
    redisClient = null;
  }
};

export const getRedis = (): Redis | null => redisClient;

// Helper: cache-aside pattern
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    if (!redisClient) return null;
    const val = await redisClient.get(key);
    return val ? (JSON.parse(val) as T) : null;
  },

  async set(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
    if (!redisClient) return;
    await redisClient.setex(key, ttlSeconds, JSON.stringify(value));
  },

  async del(key: string): Promise<void> {
    if (!redisClient) return;
    await redisClient.del(key);
  },

  async delPattern(pattern: string): Promise<void> {
    if (!redisClient) return;
    const keys = await redisClient.keys(pattern);
    if (keys.length) await redisClient.del(...keys);
  },
};
