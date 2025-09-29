"use client";

import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { Campaign, ContentPiece, WebSocketCampaignEvent, WebSocketContentPieceEvent, Draft, WebSocketDraftEvent, Document } from '@/types';
import { socketService } from '@/lib/websocket/socket';
import { useToast } from '@/components/ui/ToastProvider';

interface RealtimeState {
  campaigns: Campaign[];
  contentPieces: Record<string, ContentPiece[]>; // campaignId -> contentPieces[]
  drafts: Record<string, Draft[]>; // contentPieceId -> drafts[]
  documents: Record<string, Document[]>; // campaignId -> documents[]
}

type RealtimeAction = 
  | { type: 'SET_CAMPAIGNS'; payload: Campaign[] }
  | { type: 'ADD_CAMPAIGN'; payload: Campaign }
  | { type: 'UPDATE_CAMPAIGN'; payload: Campaign }
  | { type: 'REMOVE_CAMPAIGN'; payload: string }
  | { type: 'SET_CONTENT_PIECES'; payload: { campaignId: string; contentPieces: ContentPiece[] } }
  | { type: 'ADD_CONTENT_PIECE'; payload: { campaignId: string; contentPiece: ContentPiece } }
  | { type: 'UPDATE_CONTENT_PIECE'; payload: { campaignId: string; contentPiece: ContentPiece } }
  | { type: 'REMOVE_CONTENT_PIECE'; payload: { campaignId: string; contentPieceId: string } }
  | { type: 'SET_DRAFTS'; payload: { contentPieceId: string; drafts: Draft[] } }
  | { type: 'ADD_DRAFT'; payload: { contentPieceId: string; draft: Draft } }
  | { type: 'UPDATE_DRAFT'; payload: { contentPieceId: string; draft: Draft } }
  | { type: 'REMOVE_DRAFT'; payload: { contentPieceId: string; draftId: string } }
  | { type: 'SET_DOCUMENTS'; payload: { campaignId: string; documents: Document[] } }
  | { type: 'ADD_DOCUMENT'; payload: { campaignId: string; document: Document } }
  | { type: 'REMOVE_DOCUMENT'; payload: { campaignId: string; documentId: string } };

const initialState: RealtimeState = {
  campaigns: [],
  contentPieces: {},
  drafts: {},
  documents: {},
};

function realtimeReducer(state: RealtimeState, action: RealtimeAction): RealtimeState {
  switch (action.type) {
    case 'SET_CAMPAIGNS':
      return { ...state, campaigns: action.payload };
    
    case 'ADD_CAMPAIGN':
      return {
        ...state,
        campaigns: [...state.campaigns, action.payload],
      };
    
    case 'UPDATE_CAMPAIGN':
      return {
        ...state,
        campaigns: state.campaigns.map(c => 
          c.id === action.payload.id ? action.payload : c
        ),
      };
    
    case 'REMOVE_CAMPAIGN':
      const newContentPieces = { ...state.contentPieces };
      delete newContentPieces[action.payload];
      return {
        ...state,
        campaigns: state.campaigns.filter(c => c.id !== action.payload),
        contentPieces: newContentPieces,
      };
    
    case 'SET_CONTENT_PIECES':
      return {
        ...state,
        contentPieces: {
          ...state.contentPieces,
          [action.payload.campaignId]: action.payload.contentPieces,
        },
      };
    
    case 'ADD_CONTENT_PIECE':
      const existingPieces = state.contentPieces[action.payload.campaignId] || [];
      const pieceExists = existingPieces.some(p => p.id === action.payload.contentPiece.id);
      
      if (pieceExists) {
        console.log('⚠️ Content piece already exists, skipping duplicate:', action.payload.contentPiece.id);
        return state;
      }
      
      return {
        ...state,
        contentPieces: {
          ...state.contentPieces,
          [action.payload.campaignId]: [...existingPieces, action.payload.contentPiece],
        },
      };
    
    case 'UPDATE_CONTENT_PIECE':
      const pieces = state.contentPieces[action.payload.campaignId] || [];
      return {
        ...state,
        contentPieces: {
          ...state.contentPieces,
          [action.payload.campaignId]: pieces.map(p => 
            p.id === action.payload.contentPiece.id ? action.payload.contentPiece : p
          ),
        },
      };
    
    case 'REMOVE_CONTENT_PIECE':
      const currentPieces = state.contentPieces[action.payload.campaignId] || [];
      const newDrafts = { ...state.drafts };
      delete newDrafts[action.payload.contentPieceId];
      return {
        ...state,
        contentPieces: {
          ...state.contentPieces,
          [action.payload.campaignId]: currentPieces.filter(p => p.id !== action.payload.contentPieceId),
        },
        drafts: newDrafts,
      };
    
    case 'SET_DRAFTS':
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.payload.contentPieceId]: action.payload.drafts,
        },
      };
    
    case 'ADD_DRAFT':
      const existingDrafts = state.drafts[action.payload.contentPieceId] || [];
      const draftExists = existingDrafts.some(d => d.id === action.payload.draft.id);
      
      if (draftExists) {
        console.log('⚠️ Draft already exists, skipping duplicate:', action.payload.draft.id);
        return state;
      }
      
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.payload.contentPieceId]: [...existingDrafts, action.payload.draft],
        },
      };
    
    case 'UPDATE_DRAFT':
      const drafts = state.drafts[action.payload.contentPieceId] || [];
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.payload.contentPieceId]: drafts.map(d => 
            d.id === action.payload.draft.id ? action.payload.draft : d
          ),
        },
      };
    
    case 'REMOVE_DRAFT':
      const currentDrafts = state.drafts[action.payload.contentPieceId] || [];
      return {
        ...state,
        drafts: {
          ...state.drafts,
          [action.payload.contentPieceId]: currentDrafts.filter(d => d.id !== action.payload.draftId),
        },
      };
    
    case 'SET_DOCUMENTS':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.campaignId]: action.payload.documents,
        },
      };
    
    case 'ADD_DOCUMENT':
      const existingDocuments = state.documents[action.payload.campaignId] || [];
      const documentExists = existingDocuments.some(d => d.id === action.payload.document.id);
      
      if (documentExists) {
        console.log('⚠️ Document already exists, skipping duplicate:', action.payload.document.id);
        return state;
      }
      
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.campaignId]: [...existingDocuments, action.payload.document],
        },
      };
    
    case 'REMOVE_DOCUMENT':
      const currentDocuments = state.documents[action.payload.campaignId] || [];
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.campaignId]: currentDocuments.filter(d => d.id !== action.payload.documentId),
        },
      };
    
    default:
      return state;
  }
}

interface RealtimeContextType {
  state: RealtimeState;
  dispatch: React.Dispatch<RealtimeAction>;
  getContentPiecesForCampaign: (campaignId: string) => ContentPiece[];
  getDraftsForContentPiece: (contentPieceId: string) => Draft[];
  getDocumentsForCampaign: (campaignId: string) => Document[];
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

export const RealtimeStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(realtimeReducer, initialState);
  const { addToast } = useToast();
  const isInitialized = useRef(false);
  const stateRef = useRef(state);

  // Keep stateRef in sync with state
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Helper function to get content pieces for a campaign
  const getContentPiecesForCampaign = (campaignId: string): ContentPiece[] => {
    return state.contentPieces[campaignId] || [];
  };

  // Helper function to get drafts for a content piece
  const getDraftsForContentPiece = (contentPieceId: string): Draft[] => {
    return state.drafts[contentPieceId] || [];
  };

  // Helper function to get documents for a campaign
  const getDocumentsForCampaign = (campaignId: string): Document[] => {
    return state.documents[campaignId] || [];
  };

  // WebSocket event handlers
  useEffect(() => {
    if (isInitialized.current) return;
    isInitialized.current = true;

    console.log('🚀 Initializing RealtimeStateProvider WebSocket listeners');

    // Campaign event handlers
    const handleCampaignCreated = (campaign: WebSocketCampaignEvent) => {
      console.log('🔥 [RealtimeState] Campaign created:', campaign);
      const newCampaign: Campaign = {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        contentPieces: [],
        documents: []
      };
      
      dispatch({ type: 'ADD_CAMPAIGN', payload: newCampaign });
      addToast({
        type: "success",
        title: "New Campaign",
        message: `Campaign "${campaign.name}" was created`,
      });
    };

    const handleCampaignUpdated = (campaign: WebSocketCampaignEvent) => {
      console.log('🔥 [RealtimeState] Campaign updated:', campaign);
      const updatedCampaign: Campaign = {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        contentPieces: [],
        documents: []
      };
      
      dispatch({ type: 'UPDATE_CAMPAIGN', payload: updatedCampaign });
      addToast({
        type: "success",
        title: "Campaign Updated",
        message: `Campaign "${campaign.name}" was updated`,
      });
    };

    const handleCampaignDeleted = (data: { campaignId: string }) => {
      console.log('🔥 [RealtimeState] Campaign deleted:', data.campaignId);
      dispatch({ type: 'REMOVE_CAMPAIGN', payload: data.campaignId });
      addToast({
        type: "success",
        title: "Campaign Deleted",
        message: "Campaign was deleted",
      });
    };

    // Content piece event handlers
    const handleContentPieceCreated = (contentPiece: WebSocketContentPieceEvent) => {
      console.log('🔥 [RealtimeState] Content piece created:', contentPiece);
      const newContentPiece: ContentPiece = {
        id: contentPiece.id,
        title: contentPiece.title,
        description: contentPiece.description,
        contentType: contentPiece.contentType,
        language: contentPiece.language,
        createdAt: contentPiece.createdAt,
        updatedAt: contentPiece.updatedAt,
        campaignId: contentPiece.campaignId,
        drafts: []
      };
      
      dispatch({ 
        type: 'ADD_CONTENT_PIECE', 
        payload: { 
          campaignId: contentPiece.campaignId, 
          contentPiece: newContentPiece 
        } 
      });
      addToast({
        type: "success",
        title: "New Content Piece",
        message: `Content piece "${contentPiece.title}" was created`,
      });
    };

    const handleContentPieceUpdated = (contentPiece: WebSocketContentPieceEvent) => {
      console.log('🔥 [RealtimeState] Content piece updated:', contentPiece);
      const updatedContentPiece: ContentPiece = {
        id: contentPiece.id,
        title: contentPiece.title,
        description: contentPiece.description,
        contentType: contentPiece.contentType,
        language: contentPiece.language,
        createdAt: contentPiece.createdAt,
        updatedAt: contentPiece.updatedAt,
        campaignId: contentPiece.campaignId,
        drafts: []
      };
      
      dispatch({ 
        type: 'UPDATE_CONTENT_PIECE', 
        payload: { 
          campaignId: contentPiece.campaignId, 
          contentPiece: updatedContentPiece 
        } 
      });
      addToast({
        type: "success",
        title: "Content Piece Updated",
        message: `Content piece "${contentPiece.title}" was updated`,
      });
    };

    const handleContentPieceDeleted = (data: { contentPieceId: string }) => {
      console.log('🔥 [RealtimeState] Content piece deleted:', data.contentPieceId);
      
      // We need to find which campaign this content piece belongs to
      // Since we don't have that info in the event, we'll search through all campaigns
      const currentState = stateRef.current;
      const allContentPieces = Object.values(currentState.contentPieces).flat();
      const contentPiece = allContentPieces.find(p => p.id === data.contentPieceId);
      
      if (contentPiece) {
        console.log('✅ [RealtimeState] Found content piece to delete:', contentPiece.title, 'in campaign:', contentPiece.campaignId);
        dispatch({ 
          type: 'REMOVE_CONTENT_PIECE', 
          payload: { 
            campaignId: contentPiece.campaignId, 
            contentPieceId: data.contentPieceId 
          } 
        });
      } else {
        console.log('⚠️ [RealtimeState] Content piece not found in state:', data.contentPieceId);
      }
      
      addToast({
        type: "success",
        title: "Content Piece Deleted",
        message: "Content piece was deleted",
      });
    };

    // Draft event handlers
    const handleDraftGenerated = (data: { contentPieceId: string; draft: WebSocketDraftEvent }) => {
      console.log('🔥 [RealtimeState] Draft generated:', data.draft.id, 'for content piece:', data.contentPieceId);
      
      const newDraft: Draft = {
        id: data.draft.id,
        content: data.draft.content,
        language: data.draft.language,
        reviewState: data.draft.reviewState,
        createdAt: data.draft.createdAt,
        updatedAt: data.draft.updatedAt,
        contentPieceId: data.contentPieceId,
        translations: data.draft.translations || {},
        translationStates: data.draft.translationStates || {}
      };
      
      dispatch({ 
        type: 'ADD_DRAFT', 
        payload: { 
          contentPieceId: data.contentPieceId, 
          draft: newDraft 
        } 
      });
      
      addToast({
        type: "success",
        title: "Draft Generated",
        message: "New AI draft was generated",
      });
    };

    const handleDraftUpdated = (data: { contentPieceId: string; draft: WebSocketDraftEvent }) => {
      console.log('🔥 [RealtimeState] Draft updated:', data.draft.id, 'for content piece:', data.contentPieceId);
      
      const updatedDraft: Draft = {
        id: data.draft.id,
        content: data.draft.content,
        language: data.draft.language,
        reviewState: data.draft.reviewState,
        createdAt: data.draft.createdAt,
        updatedAt: data.draft.updatedAt,
        contentPieceId: data.contentPieceId,
        translations: data.draft.translations || {},
        translationStates: data.draft.translationStates || {}
      };
      
      dispatch({ 
        type: 'UPDATE_DRAFT', 
        payload: { 
          contentPieceId: data.contentPieceId, 
          draft: updatedDraft 
        } 
      });
      
      addToast({
        type: "success",
        title: "Draft Updated",
        message: "Draft was updated",
      });
    };

    const handleDraftDeleted = (data: { contentPieceId: string; draftId: string }) => {
      console.log('🔥 [RealtimeState] Draft deleted:', data.draftId, 'from content piece:', data.contentPieceId);
      
      dispatch({ 
        type: 'REMOVE_DRAFT', 
        payload: { 
          contentPieceId: data.contentPieceId, 
          draftId: data.draftId 
        } 
      });
      
      addToast({
        type: "success",
        title: "Draft Deleted",
        message: "Draft was deleted",
      });
    };

    // Document event handlers
    const handleDocumentUploaded = (data: { campaignId: string; document: Document }) => {
      console.log('🔥 [RealtimeState] Document uploaded:', data.document.id, 'for campaign:', data.campaignId);
      
      dispatch({ 
        type: 'ADD_DOCUMENT', 
        payload: { 
          campaignId: data.campaignId, 
          document: data.document 
        } 
      });
      
      addToast({
        type: "success",
        title: "Document Uploaded",
        message: `Document "${data.document.originalName}" was uploaded`,
      });
    };

    const handleDocumentDeleted = (data: { campaignId: string; documentId: string }) => {
      console.log('🔥 [RealtimeState] Document deleted:', data.documentId, 'from campaign:', data.campaignId);
      
      dispatch({ 
        type: 'REMOVE_DOCUMENT', 
        payload: { 
          campaignId: data.campaignId, 
          documentId: data.documentId 
        } 
      });
      
      addToast({
        type: "success",
        title: "Document Deleted",
        message: "Document was deleted",
      });
    };

    // Set up WebSocket listeners
    socketService.connect();
    socketService.onCampaignCreated(handleCampaignCreated);
    socketService.onCampaignUpdated(handleCampaignUpdated);
    socketService.onCampaignDeleted(handleCampaignDeleted);
    socketService.onContentPieceCreated(handleContentPieceCreated);
    socketService.onContentPieceUpdated(handleContentPieceUpdated);
    socketService.onContentPieceDeleted(handleContentPieceDeleted);
    socketService.onDraftGenerated(handleDraftGenerated);
    socketService.onDraftUpdated(handleDraftUpdated);
    socketService.onDraftDeleted(handleDraftDeleted);
    socketService.onDocumentUploaded(handleDocumentUploaded);
    socketService.onDocumentDeleted(handleDocumentDeleted);

    console.log('✅ [RealtimeState] WebSocket listeners initialized');

    // Cleanup function
    return () => {
      console.log('🧹 [RealtimeState] Cleaning up WebSocket listeners');
      socketService.off('campaign-created', handleCampaignCreated as (...args: unknown[]) => void);
      socketService.off('campaign-updated', handleCampaignUpdated as (...args: unknown[]) => void);
      socketService.off('campaign-deleted', handleCampaignDeleted as (...args: unknown[]) => void);
      socketService.off('content-piece-created', handleContentPieceCreated as (...args: unknown[]) => void);
      socketService.off('content-piece-updated', handleContentPieceUpdated as (...args: unknown[]) => void);
      socketService.off('content-piece-deleted', handleContentPieceDeleted as (...args: unknown[]) => void);
      socketService.off('draft-generated', handleDraftGenerated as (...args: unknown[]) => void);
      socketService.off('draft-updated', handleDraftUpdated as (...args: unknown[]) => void);
      socketService.off('draft-deleted', handleDraftDeleted as (...args: unknown[]) => void);
      socketService.off('document-uploaded', handleDocumentUploaded as (...args: unknown[]) => void);
      socketService.off('document-deleted', handleDocumentDeleted as (...args: unknown[]) => void);
    };
  }, [addToast]);

  const contextValue: RealtimeContextType = {
    state,
    dispatch,
    getContentPiecesForCampaign,
    getDraftsForContentPiece,
    getDocumentsForCampaign,
  };

  return (
    <RealtimeContext.Provider value={contextValue}>
      {children}
    </RealtimeContext.Provider>
  );
};

export const useRealtimeState = () => {
  const context = useContext(RealtimeContext);
  if (context === undefined) {
    throw new Error('useRealtimeState must be used within a RealtimeStateProvider');
  }
  return context;
};
