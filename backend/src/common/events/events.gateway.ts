import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards, Logger } from '@nestjs/common';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  
  private readonly logger = new Logger(EventsGateway.name);
  private userSocketMap = new Map<string, string>(); // userId -> socketId

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    
    // Remove user from socket map
    for (const [userId, socketId] of this.userSocketMap.entries()) {
      if (socketId === client.id) {
        this.userSocketMap.delete(userId);
        break;
      }
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User ${data.userId} joined with socket ${client.id}`);
    this.userSocketMap.set(data.userId, client.id);
    
    // Join user-specific room
    client.join(`user_${data.userId}`);
    
    return { status: 'success', message: 'Joined successfully' };
  }

  @SubscribeMessage('leave')
  handleLeave(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    this.logger.log(`User ${data.userId} left`);
    this.userSocketMap.delete(data.userId);
    client.leave(`user_${data.userId}`);
    
    return { status: 'success', message: 'Left successfully' };
  }

  // Methods to emit events to clients
  emitToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, data);
  }

  emitToAll(event: string, data: any) {
    this.server.emit(event, data);
  }

  // Campaign-related events
  emitCampaignCreated(userId: string, campaign: any) {
    this.emitToUser(userId, 'campaign:created', campaign);
  }

  emitCampaignUpdated(userId: string, campaign: any) {
    this.emitToUser(userId, 'campaign:updated', campaign);
  }

  emitCampaignDeleted(userId: string, campaignId: string) {
    this.emitToUser(userId, 'campaign:deleted', { id: campaignId });
  }

  // Content-related events
  emitContentCreated(userId: string, content: any) {
    this.emitToUser(userId, 'content:created', content);
  }

  emitContentUpdated(userId: string, content: any) {
    this.emitToUser(userId, 'content:updated', content);
  }

  emitContentDeleted(userId: string, contentId: string) {
    this.emitToUser(userId, 'content:deleted', { id: contentId });
  }

  emitContentAiGenerated(userId: string, content: any) {
    this.emitToUser(userId, 'content:ai-generated', content);
  }

  emitContentStatusChanged(userId: string, contentId: string, status: string, content?: any) {
    this.emitToUser(userId, 'content:status-changed', { 
      id: contentId, 
      status,
      ...(content && { content })
    });
  }

  // Translation-related events
  emitTranslationCreated(userId: string, translation: any) {
    this.emitToUser(userId, 'translation:created', translation);
  }

  emitTranslationUpdated(userId: string, translation: any) {
    this.emitToUser(userId, 'translation:updated', translation);
  }
}
