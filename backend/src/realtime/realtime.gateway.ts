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

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(RealtimeGateway.name);

  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket): void {
    this.logger.log(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Socket disconnected: ${client.id}`);
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

  emitToCampaign(campaignId: string, event: string, payload: Record<string, unknown>): void {
    this.server.to(this.getCampaignRoom(campaignId)).emit(event, payload);
  }

  private getCampaignRoom(campaignId: string): string {
    return `campaign:${campaignId}`;
  }
}
