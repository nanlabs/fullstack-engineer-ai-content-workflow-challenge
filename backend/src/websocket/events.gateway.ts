import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { RedisService } from '../redis/redis.service';

export interface WsEvent {
  event: string;
  campaignId: string;
  data: Record<string, unknown>;
}

@WebSocketGateway({
  cors: { origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true },
  namespace: '/',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(private readonly redis: RedisService) {}

  afterInit() {
    this.logger.log('WebSocket gateway initialized');
    this.subscribeToRedisEvents();
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:campaign')
  handleJoinCampaign(
    @ConnectedSocket() client: Socket,
    @MessageBody() campaignId: string,
  ) {
    client.join(`campaign:${campaignId}`);
    this.logger.debug(`Client ${client.id} joined campaign:${campaignId}`);
    return { event: 'joined', campaignId };
  }

  @SubscribeMessage('leave:campaign')
  handleLeaveCampaign(
    @ConnectedSocket() client: Socket,
    @MessageBody() campaignId: string,
  ) {
    client.leave(`campaign:${campaignId}`);
    this.logger.debug(`Client ${client.id} left campaign:${campaignId}`);
    return { event: 'left', campaignId };
  }

  /**
   * Broadcasts an event to all clients in a campaign room via Redis.
   * @param campaignId - Target campaign UUID
   * @param event - Event name (e.g. "draft:created")
   * @param data - Event payload
   */
  async emitToCampaign(campaignId: string, event: string, data: Record<string, unknown>) {
    await this.redis.publish('ws:events', JSON.stringify({ event, campaignId, data }));
    this.server.to(`campaign:${campaignId}`).emit(event, { ...data, campaignId });
  }

  private async subscribeToRedisEvents() {
    await this.redis.subscribe('ws:events', (message: string) => {
      try {
        const { event, campaignId, data } = JSON.parse(message) as WsEvent;
        this.server.to(`campaign:${campaignId}`).emit(event, { ...data, campaignId });
      } catch {
        this.logger.warn('Failed to parse Redis WS event');
      }
    });
  }
}
