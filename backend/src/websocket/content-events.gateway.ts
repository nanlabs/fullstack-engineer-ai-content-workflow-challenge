import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'socket.io';

export enum ContentEvent {
  ContentCreated = 'content:created',
  ContentUpdated = 'content:updated',
  ContentDeleted = 'content:deleted',
  AiDraftGenerated = 'ai:draft_generated',
  ReviewStateChanged = 'review:state_changed',
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class ContentEventsGateway {
  @WebSocketServer()
  server: Server;

  emitContentCreated(campaignId: string, content: unknown) {
    this.server.emit(ContentEvent.ContentCreated, { campaignId, content });
  }

  emitContentUpdated(contentId: string, content: unknown) {
    this.server.emit(ContentEvent.ContentUpdated, { contentId, content });
  }

  emitContentDeleted(contentId: string) {
    this.server.emit(ContentEvent.ContentDeleted, { contentId });
  }

  emitAiDraftGenerated(contentId: string, aiDraft: string) {
    this.server.emit(ContentEvent.AiDraftGenerated, { contentId, aiDraft });
  }

  emitReviewStateChanged(contentId: string, reviewState: string) {
    this.server.emit(ContentEvent.ReviewStateChanged, { contentId, reviewState });
  }
}
