import { io, Socket } from "socket.io-client";
import {
  WebSocketCampaignEvent,
  WebSocketContentPieceEvent,
  WebSocketDraftEvent,
  Document as CustomDocument,
} from "@/types";

class SocketService {
  private socket: Socket | null = null;
  private isConnected = false;
  private eventListeners = new Map<string, Set<(...args: unknown[]) => void>>();
  private processedEvents = new Set<string>(); // Track processed events to prevent duplicates

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
      console.log('🔌 WebSocket connected');
    });

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      console.log('🔌 WebSocket disconnected');
    });

    this.socket.on("connected", (data) => {
      console.log('🔌 WebSocket server confirmed connection:', data);
    });

    this.socket.on("connect_error", (error) => {
      this.isConnected = false;
      console.error('🔌 WebSocket connection error:', error);
    });

    return this.socket;
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.eventListeners.clear();
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }

  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  // Event listeners for real-time updates with proper tracking
  private addEventListener(event: string, callback: (...args: unknown[]) => void): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    // Check if callback already exists to prevent duplicates
    const existingCallbacks = this.eventListeners.get(event)!;
    if (existingCallbacks.has(callback)) {
      console.log(`⚠️ Callback already exists for event ${event}, skipping duplicate`);
      return;
    }
    
    existingCallbacks.add(callback);
    this.socket?.on(event, callback as (...args: unknown[]) => void);
    console.log(`✅ Added listener for ${event}, total: ${existingCallbacks.size}`);
  }

  private removeEventListener(event: string, callback?: (...args: unknown[]) => void): void {
    if (callback) {
      const existingCallbacks = this.eventListeners.get(event);
      if (existingCallbacks?.has(callback)) {
        existingCallbacks.delete(callback);
        this.socket?.off(event, callback as (...args: unknown[]) => void);
        console.log(`🗑️ Removed listener for ${event}, remaining: ${existingCallbacks.size}`);
      }
    } else {
      // Remove all listeners for this event
      const existingCallbacks = this.eventListeners.get(event);
      if (existingCallbacks) {
        existingCallbacks.forEach(cb => {
          this.socket?.off(event, cb as (...args: unknown[]) => void);
        });
        console.log(`🗑️ Removed all listeners for ${event} (${existingCallbacks.size} total)`);
        this.eventListeners.delete(event);
      }
    }
  }

  onCampaignCreated(
    callback: (campaign: WebSocketCampaignEvent) => void
  ): void {
    this.addEventListener("campaign-created", callback as (...args: unknown[]) => void);
  }

  onCampaignUpdated(
    callback: (campaign: WebSocketCampaignEvent) => void
  ): void {
    this.addEventListener("campaign-updated", callback as (...args: unknown[]) => void);
  }

  onCampaignDeleted(callback: (data: { campaignId: string }) => void): void {
    this.addEventListener("campaign-deleted", callback as (...args: unknown[]) => void);
  }

  onContentPieceCreated(
    callback: (contentPiece: WebSocketContentPieceEvent) => void
  ): void {
    this.addEventListener("content-piece-created", callback as (...args: unknown[]) => void);
  }

  onContentPieceUpdated(
    callback: (contentPiece: WebSocketContentPieceEvent) => void
  ): void {
    this.addEventListener("content-piece-updated", callback as (...args: unknown[]) => void);
  }

  onContentPieceDeleted(
    callback: (data: { contentPieceId: string }) => void
  ): void {
    this.addEventListener("content-piece-deleted", callback as (...args: unknown[]) => void);
  }

  onDraftGenerated(
    callback: (data: {
      contentPieceId: string;
      draft: WebSocketDraftEvent;
    }) => void
  ): void {
    this.addEventListener("draft-generated", callback as (...args: unknown[]) => void);
  }

  onDraftUpdated(
    callback: (data: {
      contentPieceId: string;
      draft: WebSocketDraftEvent;
    }) => void
  ): void {
    this.addEventListener("draft-updated", callback as (...args: unknown[]) => void);
  }

  onDraftDeleted(
    callback: (data: { contentPieceId: string; draftId: string }) => void
  ): void {
    this.addEventListener("draft-deleted", callback as (...args: unknown[]) => void);
  }

  onAIGenerationStarted(
    callback: (data: { contentPieceId: string; prompt: string }) => void
  ): void {
    this.addEventListener("ai-generation-started", callback as (...args: unknown[]) => void);
  }

  onAIGenerationCompleted(
    callback: (data: {
      contentPieceId: string;
      draft: WebSocketDraftEvent;
    }) => void
  ): void {
    this.addEventListener("ai-generation-completed", callback as (...args: unknown[]) => void);
  }

  onAIGenerationFailed(
    callback: (data: { contentPieceId: string; error: string }) => void
  ): void {
    this.addEventListener("ai-generation-failed", callback as (...args: unknown[]) => void);
  }

  onDocumentUploaded(
    callback: (data: { campaignId: string; document: CustomDocument }) => void
  ): void {
    this.addEventListener("document-uploaded", callback as (...args: unknown[]) => void);
  }

  onDocumentDeleted(
    callback: (data: { campaignId: string; documentId: string }) => void
  ): void {
    this.addEventListener("document-deleted", callback as (...args: unknown[]) => void);
  }

  onChainOfThoughts(
    callback: (data: {
      contentPieceId: string;
      thought: { step: string; message: string; progress: number };
    }) => void
  ): void {
    this.addEventListener("chain-of-thoughts", callback as (...args: unknown[]) => void);
  }

  // Remove event listeners with proper tracking
  off(event: string, callback?: (...args: unknown[]) => void): void {
    this.removeEventListener(event, callback);
  }

  // Remove all listeners
  removeAllListeners(): void {
    this.eventListeners.clear();
    this.socket?.removeAllListeners();
  }

  // Get count of listeners for debugging
  getListenerCount(event?: string): number {
    if (event) {
      return this.eventListeners.get(event)?.size || 0;
    }
    return Array.from(this.eventListeners.values()).reduce((total, set) => total + set.size, 0);
  }

  // Clear processed events to prevent memory leaks (call periodically)
  clearProcessedEvents(): void {
    this.processedEvents.clear();
  }
}

// Export singleton instance
export const socketService = new SocketService();
export default socketService;
