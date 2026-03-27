import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;
  private isConnected = false;

  constructor(private readonly config: ConfigService) {
    this.client = new Redis(this.config.get('REDIS_URL') || 'redis://localhost:6379', {
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Redis connected');
    });

    this.client.on('error', (err) => {
      this.isConnected = false;
      this.logger.warn(`Redis unavailable: ${err.message} — running without cache`);
    });

    this.client.connect().catch(() => {});
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected) return null;
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds = 3600): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    } catch {
      // ignore
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected) return;
    try {
      await this.client.del(key);
    } catch {
      // ignore
    }
  }

  onModuleDestroy() {
    this.client.disconnect();
  }
}
