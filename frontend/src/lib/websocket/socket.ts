import { io, Socket } from "socket.io-client";
import {
  WebSocketCampaignEvent,
  WebSocketContentPieceEvent,
  WebSocketDraftEvent,
} from "@/types";

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;

  connect(): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001";

    this.socket = io(wsUrl, {
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
    });

    this.socket.on("connected", (data) => {});

    this.socket.on("connect_error", (error) => {
      this.isConnected = false;
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Event listeners for real-time updates
  onCampaignCreated(
    callback: (campaign: WebSocketCampaignEvent) => void
  ): void {
    this.socket?.on("campaign-created", callback);
  }

  onCampaignUpdated(
    callback: (campaign: WebSocketCampaignEvent) => void
  ): void {
    this.socket?.on("campaign-updated", callback);
  }

  onCampaignDeleted(callback: (data: { campaignId: string }) => void): void {
    this.socket?.on("campaign-deleted", callback);
  }

  onContentPieceCreated(
    callback: (contentPiece: WebSocketContentPieceEvent) => void
  ): void {
    this.socket?.on("content-piece-created", callback);
  }

  onContentPieceUpdated(
    callback: (contentPiece: WebSocketContentPieceEvent) => void
  ): void {
    this.socket?.on("content-piece-updated", callback);
  }

  onContentPieceDeleted(
    callback: (data: { contentPieceId: string }) => void
  ): void {
    this.socket?.on("content-piece-deleted", callback);
  }

  onDraftGenerated(
    callback: (data: {
      contentPieceId: string;
      draft: WebSocketDraftEvent;
    }) => void
  ): void {
    this.socket?.on("draft-generated", callback);
  }

  onDraftUpdated(
    callback: (data: {
      contentPieceId: string;
      draft: WebSocketDraftEvent;
    }) => void
  ): void {
    this.socket?.on("draft-updated", callback);
  }

  onDraftDeleted(
    callback: (data: { contentPieceId: string; draftId: string }) => void
  ): void {
    this.socket?.on("draft-deleted", callback);
  }

  onAIGenerationStarted(
    callback: (data: { contentPieceId: string; prompt: string }) => void
  ): void {
    this.socket?.on("ai-generation-started", callback);
  }

  onAIGenerationCompleted(
    callback: (data: {
      contentPieceId: string;
      draft: WebSocketDraftEvent;
    }) => void
  ): void {
    this.socket?.on("ai-generation-completed", callback);
  }

  onAIGenerationFailed(
    callback: (data: { contentPieceId: string; error: string }) => void
  ): void {
    this.socket?.on("ai-generation-failed", callback);
  }

  onDocumentUploaded(
    callback: (data: { campaignId: string; document: Document }) => void
  ): void {
    this.socket?.on("document-uploaded", callback);
  }

  onDocumentDeleted(
    callback: (data: { campaignId: string; documentId: string }) => void
  ): void {
    this.socket?.on("document-deleted", callback);
  }

  onChainOfThoughts(
    callback: (data: {
      contentPieceId: string;
      thought: { step: string; message: string; progress: number };
    }) => void
  ): void {
    this.socket?.on("chain-of-thoughts", callback);
  }

  // Remove event listeners
  off(event: string, callback?: (...args: unknown[]) => void): void {
    this.socket?.off(event, callback);
  }

  // Remove all listeners
  removeAllListeners(): void {
    this.socket?.removeAllListeners();
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
