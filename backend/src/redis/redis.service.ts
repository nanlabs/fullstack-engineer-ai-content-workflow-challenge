import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private pub!: Redis;
  private sub!: Redis;
  private readonly logger = new Logger(RedisService.name);
  private readonly handlers = new Map<string, ((message: string) => void)[]>();

  constructor(private readonly config: ConfigService) {}

  async onModuleInit() {
    const url = this.config.get<string>('REDIS_URL') || 'redis://localhost:6379';

    try {
      this.pub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
      this.sub = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
      await Promise.all([this.pub.connect(), this.sub.connect()]);
      this.logger.log('Redis connected');

      this.sub.on('message', (channel: string, message: string) => {
        const channelHandlers = this.handlers.get(channel) || [];
        channelHandlers.forEach((handler) => handler(message));
      });
    } catch (error) {
      this.logger.warn(`Redis connection failed: ${(error as Error).message}. Running without pub/sub.`);
    }
  }

  async onModuleDestroy() {
    await this.pub?.quit().catch(() => {});
    await this.sub?.quit().catch(() => {});
  }

  /**
   * Publishes a JSON event to a Redis channel.
   * @param channel - The channel name (e.g. "campaign:uuid")
   * @param data - Serializable event payload
   */
  async publish(channel: string, data: unknown): Promise<void> {
    if (!this.pub) return;
    try {
      await this.pub.publish(channel, JSON.stringify(data));
    } catch (error) {
      this.logger.warn(`Redis publish failed: ${(error as Error).message}`);
    }
  }

  /**
   * Subscribes to a Redis channel with a handler function.
   * @param channel - The channel name
   * @param handler - Callback receiving the raw message string
   */
  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (!this.sub) return;
    const existing = this.handlers.get(channel) || [];
    this.handlers.set(channel, [...existing, handler]);

    if (existing.length === 0) {
      await this.sub.subscribe(channel);
    }
  }
}
