import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || '*',
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(EventsGateway.name);

  afterInit(): void {
    this.logger.log('WebSocket gateway initialized.');
  }

  handleConnection(client: Socket): void {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket): void {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  emitContentUpdated(campaignId: string, contentPiece: any): void {
    this.server.emit('content:updated', {
      campaignId,
      contentId: contentPiece?.id,
      contentPiece,
    });
  }

  emitDraftGenerated(campaignId: string, draft: any): void {
    this.server.emit('draft:generated', {
      campaignId,
      contentId: draft?.contentPieceId,
      draftId: draft?.id,
      draft,
    });
  }

  emitTranslationCreated(campaignId: string, translation: any): void {
    this.server.emit('translation:created', {
      campaignId,
      contentId: translation?.contentPieceId,
      translationId: translation?.id,
      translation,
    });
  }
}
