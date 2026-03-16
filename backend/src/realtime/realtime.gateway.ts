import { Logger } from '@nestjs/common';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { EventsService } from '../events/events.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly eventsService: EventsService) {}

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  afterInit(): void {
    this.unsubscribe = this.eventsService.onEvent(({ event, payload }) => {
      const campaignId = payload.campaignId;
      if (typeof campaignId === 'string' && campaignId.length > 0) {
        this.server.to(this.getCampaignRoom(campaignId)).emit(event, payload);
        return;
      }

      this.server.emit(event, payload);
    });
  }

  @SubscribeMessage('campaign:join')
  handleCampaignJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { campaignId?: string },
  ): void {
    if (!payload?.campaignId) {
      return;
    }

    const room = this.getCampaignRoom(payload.campaignId);
    client.join(room);
    client.emit('campaign:join', {
      campaignId: payload.campaignId,
      joined: true,
    });
  }

  onModuleDestroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private getCampaignRoom(campaignId: string): string {
    return `campaign:${campaignId}`;
  }
}
