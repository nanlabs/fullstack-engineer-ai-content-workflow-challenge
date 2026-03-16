import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, RedisClientType } from 'redis';

type WorkflowEvent = {
  event: string;
  payload: Record<string, unknown>;
  publishedAt: string;
};

type EventHandler = (message: WorkflowEvent) => void;

@Injectable()
export class EventsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(EventsService.name);
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private handlers: EventHandler[] = [];
  private readonly channel: string;

  constructor(private readonly configService: ConfigService) {
    this.channel = this.configService.get<string>('REDIS_EVENTS_CHANNEL', 'content_workflow_events');
  }

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = Number(this.configService.get<string>('REDIS_PORT', '6379'));
    const url = `redis://${host}:${port}`;

    this.publisher = createClient({ url });
    this.subscriber = createClient({ url });

    this.publisher.on('error', (error) => {
      this.logger.error(`Redis publisher error: ${String(error)}`);
    });
    this.subscriber.on('error', (error) => {
      this.logger.error(`Redis subscriber error: ${String(error)}`);
    });

    await this.publisher.connect();
    await this.subscriber.connect();

    await this.subscriber.subscribe(this.channel, (rawMessage: string) => {
      try {
        const message = JSON.parse(rawMessage) as WorkflowEvent;
        this.handlers.forEach((handler) => handler(message));
      } catch (error) {
        this.logger.warn(`Invalid Redis event payload: ${String(error)}`);
      }
    });

    this.logger.log(`Redis events connected on ${url} channel "${this.channel}"`);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.subscriber?.isOpen) {
      await this.subscriber.quit();
    }
    if (this.publisher?.isOpen) {
      await this.publisher.quit();
    }
  }

  onEvent(handler: EventHandler): () => void {
    this.handlers.push(handler);
    return () => {
      this.handlers = this.handlers.filter((registered) => registered !== handler);
    };
  }

  async publish(event: string, payload: Record<string, unknown>): Promise<void> {
    if (!this.publisher?.isOpen) {
      this.logger.warn(`Publish skipped, Redis is not ready: ${event}`);
      return;
    }

    const envelope: WorkflowEvent = {
      event,
      payload,
      publishedAt: new Date().toISOString(),
    };

    await this.publisher.publish(this.channel, JSON.stringify(envelope));
  }
}
