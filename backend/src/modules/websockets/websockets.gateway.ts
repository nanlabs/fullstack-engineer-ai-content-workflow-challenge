import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: ['http://localhost:3000'],
    credentials: true,
  },
})
export class WebsocketsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketsGateway.name);
  private connectedClients = new Map<string, Socket>();

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
    
    // Send welcome message
    client.emit('connected', { 
      message: 'Connected to ACME AI Workflow', 
      clientId: client.id 
    });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  // Campaign Events
  notifyCampaignCreated(campaign: any) {
    this.server.emit('campaign-created', campaign);
    this.logger.log(`Notified clients about new campaign: ${campaign.name}`);
  }

  notifyCampaignUpdated(campaign: any) {
    this.server.emit('campaign-updated', campaign);
    this.logger.log(`Notified clients about campaign update: ${campaign.name}`);
  }

  notifyCampaignDeleted(campaignId: string) {
    this.server.emit('campaign-deleted', { campaignId });
    this.logger.log(`Notified clients about campaign deletion: ${campaignId}`);
  }

  // Content Piece Events
  notifyContentPieceCreated(contentPiece: any) {
    this.server.emit('content-piece-created', contentPiece);
    this.logger.log(`Notified clients about new content piece: ${contentPiece.title}`);
  }

  notifyContentPieceUpdated(contentPiece: any) {
    this.server.emit('content-piece-updated', contentPiece);
    this.logger.log(`Notified clients about content piece update: ${contentPiece.title}`);
  }

  notifyContentPieceDeleted(contentPieceId: string) {
    this.server.emit('content-piece-deleted', { contentPieceId });
    this.logger.log(`Notified clients about content piece deletion: ${contentPieceId}`);
  }

  // AI Generation Events
  notifyDraftGenerated(contentPieceId: string, draft: any) {
    this.server.emit('draft-generated', { contentPieceId, draft });
    this.logger.log(`Notified clients about new AI draft for content piece: ${contentPieceId}`);
  }

  notifyDraftUpdated(contentPieceId: string, draft: any) {
    this.server.emit('draft-updated', { contentPieceId, draft });
    this.logger.log(`Notified clients about draft update for content piece: ${contentPieceId}`);
  }

  notifyDraftDeleted(contentPieceId: string, draftId: string) {
    this.server.emit('draft-deleted', { contentPieceId, draftId });
    this.logger.log(`Notified clients about draft deletion: ${draftId}`);
  }

  // AI Generation Status Events
  notifyAIGenerationStarted(contentPieceId: string, prompt: string) {
    this.server.emit('ai-generation-started', { contentPieceId, prompt });
    this.logger.log(`Notified clients about AI generation start for content piece: ${contentPieceId}`);
  }

  notifyAIGenerationCompleted(contentPieceId: string, draft: any) {
    this.server.emit('ai-generation-completed', { contentPieceId, draft });
    this.logger.log(`Notified clients about AI generation completion for content piece: ${contentPieceId}`);
  }

  notifyAIGenerationFailed(contentPieceId: string, error: string) {
    this.server.emit('ai-generation-failed', { contentPieceId, error });
    this.logger.log(`Notified clients about AI generation failure for content piece: ${contentPieceId}`);
  }

  // Translation Events
  notifyTranslationStarted(draftId: string, targetLanguages: string[]) {
    this.server.emit('translation-started', { draftId, targetLanguages });
    this.logger.log(`Notified clients about translation start for draft: ${draftId}`);
  }

  notifyTranslationCompleted(draftId: string, results: any[]) {
    this.server.emit('translation-completed', { draftId, results });
    this.logger.log(`Notified clients about translation completion for draft: ${draftId}`);
  }

  notifyTranslationFailed(draftId: string, error: string) {
    this.server.emit('translation-failed', { draftId, error });
    this.logger.log(`Notified clients about translation failure for draft: ${draftId}`);
  }

  notifyTranslationStateUpdated(draftId: string, language: string, state: string) {
    this.server.emit('translation-state-updated', { draftId, language, state });
    this.logger.log(`Notified clients about translation state update: ${language} -> ${state}`);
  }

  // Document Events
  notifyDocumentUploaded(campaignId: string, document: any) {
    this.server.emit('document-uploaded', { campaignId, document });
    this.logger.log(`Notified clients about document upload for campaign: ${campaignId}`);
  }

  notifyDocumentDeleted(campaignId: string, documentId: string) {
    this.server.emit('document-deleted', { campaignId, documentId });
    this.logger.log(`Notified clients about document deletion: ${documentId}`);
  }

  // Chain of Thoughts Events
  notifyChainOfThoughts(contentPieceId: string, thought: { step: string; message: string; progress: number }) {
    console.log(`Emitting chain-of-thoughts event for content piece: ${contentPieceId}`, thought);
    this.server.emit('chain-of-thoughts', { contentPieceId, thought });
    this.logger.log(`Notified clients about chain of thoughts for content piece: ${contentPieceId} - ${thought.step}`);
  }

  // Utility method to get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }
}
