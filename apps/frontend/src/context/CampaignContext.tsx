import type { Campaign, Content, ContentTranslation } from '@/lib/types';
import React, { createContext, use, useState, useMemo, type ReactNode, useEffect } from 'react';
import { gql } from '@apollo/client';
import { client } from '@/lib/apolloClient';

// Define the context value type
type CampaignContextType = {
  campaigns: Campaign[];
  setCampaigns: React.Dispatch<React.SetStateAction<Campaign[]>>;
};

// Create the context
const CampaignContext = createContext<CampaignContextType | undefined>(undefined);

// Define the subscription query
const CAMPAIGN_GET_ALL_QUERY = gql`
  query GetCampaigns {
    campaigns {
      id
      name
      description
      createdAt
      updatedAt
      contentPieces {
        id
        reviewState
        aiGeneratedDraft
        sourceLanguage
        createdAt
        updatedAt
        translations {
          id
          languageCode
          translatedTitle
          translatedDescription
          isAIGenerated
          isHumanEdited
          createdAt
          updatedAt
        }
      }
    }
  }
`;

const CAMPAIGN_UPDATED_SUBSCRIPTION = gql`
  subscription OnCampaignUpdated {
    campaignUpdated {
      id
      name
      description
      createdAt
      updatedAt
      contentPieces {
        id
        reviewState
        aiGeneratedDraft
        sourceLanguage
        createdAt
        updatedAt
        translations {
          id
          languageCode
          translatedTitle
          translatedDescription
          isAIGenerated
          isHumanEdited
          createdAt
          updatedAt
        }
      }
    }
  }
`;

const CONTENT_PIECE_UPDATED_SUBSCRIPTION = gql`
  subscription onContentPieceUpdated {
    contentPieceUpdated {
      id
      campaignId
      reviewState
      aiGeneratedDraft
      sourceLanguage
      createdAt
      updatedAt
      translations {
        id
        languageCode
        translatedTitle
        translatedDescription
        isAIGenerated
        isHumanEdited
        createdAt
        updatedAt
      }
    }
  }
`;

const CONTENT_PIECE_TRANSLATION_UPDATED_SUBSCRIPTION = gql`
  subscription onContentPieceTranslationUpdated {
    contentPieceTranslationUpdated {
      id
      campaignId
      contentPieceId
      languageCode
      translatedTitle
      translatedDescription
      isAIGenerated
      isHumanEdited
      createdAt
      updatedAt
    }
  }
`;

// Create the provider component
export const CampaignProvider = ({ children }: { children: ReactNode }) => {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);

  // query for initial campaigns
  useEffect(() => {
    client
      .query<{ campaigns: Campaign[] }>({
        query: CAMPAIGN_GET_ALL_QUERY,
        fetchPolicy: 'network-only', // Always fetch from network to get the latest data
      })
      .then((result) => {
        if (result.data && result.data.campaigns) {
          setCampaigns(result.data.campaigns);
        }
      })
      .catch((error) => {
        console.error('Error fetching campaigns:', error);
      });
  }, []);

  // Subscribe to campaign updates
  useEffect(() => {
    const campaignObservable = client.subscribe<{ campaignUpdated: Campaign }>({
      query: CAMPAIGN_UPDATED_SUBSCRIPTION,
    });
    const campaignSubscription = campaignObservable.subscribe({
      next: (result) => {
        if (!result.data) return;

        const updatedCampaign = result.data.campaignUpdated;
        setCampaigns((prevCampaigns) => {
          const index = prevCampaigns.findIndex((c) => c.id === updatedCampaign.id);
          if (index === -1) {
            // Add new campaign
            return [...prevCampaigns, updatedCampaign];
          }
          const updatedCampaigns = [...prevCampaigns];
          if (updatedCampaigns[index].name === undefined) {
            // Remove campaign if name is undefined (indicating deletion)
            updatedCampaigns.splice(index, 1);
            return updatedCampaigns;
          }
          // Update existing campaign
          updatedCampaigns[index] = updatedCampaign;
          return updatedCampaigns;
        });
      },
    });

    // Subscribe to content piece updates
    const contentPieceObservable = client.subscribe<{
      contentPieceUpdated: Content & { campaignId: string };
    }>({
      query: CONTENT_PIECE_UPDATED_SUBSCRIPTION,
    });
    const contentPieceSubscription = contentPieceObservable.subscribe({
      next: (result) => {
        if (!result.data) return;

        const updatedContentPiece = result.data.contentPieceUpdated;
        setCampaigns((prevCampaigns) => {
          const campaignIndex = prevCampaigns.findIndex((c) => c.id === updatedContentPiece.campaignId);
          if (campaignIndex === -1) return prevCampaigns; // Campaign not found

          const updatedCampaigns = [...prevCampaigns];
          const contentPieces = updatedCampaigns[campaignIndex].contentPieces;
          const contentIndex = contentPieces.findIndex((cp) => cp.id === updatedContentPiece.id);

          if (contentIndex === -1) {
            // Add new content piece
            contentPieces.push(updatedContentPiece);
          } else {
            if (updatedContentPiece.reviewState === undefined) {
              // Remove content piece if reviewState is undefined (indicating deletion)
              contentPieces.splice(contentIndex, 1);
            } else {
              // Update existing content piece
              contentPieces[contentIndex] = updatedContentPiece;
            }
          }
          return updatedCampaigns;
        });
      },
    });

    // Subscribe to content piece translation updates
    const contentPieceTranslationObservable = client.subscribe<{
      contentPieceTranslationUpdated: ContentTranslation & { campaignId: string; contentPieceId: string };
    }>({
      query: CONTENT_PIECE_TRANSLATION_UPDATED_SUBSCRIPTION,
    });
    const contentPieceTranslationSubscription = contentPieceTranslationObservable.subscribe({
      next: (result) => {
        if (!result.data) return;

        const updatedTranslation = result.data.contentPieceTranslationUpdated;
        setCampaigns((prevCampaigns) => {
          const campaignIndex = prevCampaigns.findIndex((c) => c.id === updatedTranslation.campaignId);
          if (campaignIndex === -1) return prevCampaigns; // Campaign not found

          const updatedCampaigns = [...prevCampaigns];
          const contentPieces = updatedCampaigns[campaignIndex].contentPieces;
          const contentIndex = contentPieces.findIndex((cp) => cp.id === updatedTranslation.contentPieceId);
          if (contentIndex === -1) return prevCampaigns; // Content piece not found

          const translations = contentPieces[contentIndex].translations;
          const translationIndex = translations.findIndex((t) => t.id === updatedTranslation.id);

          if (translationIndex === -1) {
            // Add new translation
            translations.push(updatedTranslation);
          } else {
            if (updatedTranslation.translatedTitle === undefined) {
              // Remove translation if translatedTitle is undefined (indicating deletion)
              translations.splice(translationIndex, 1);
            } else {
              // Update existing translation
              translations[translationIndex] = updatedTranslation;
            }
          }
          return updatedCampaigns;
        });
      },
    });

    // Cleanup subscriptions on unmount
    return () => {
      campaignSubscription.unsubscribe();
      contentPieceSubscription.unsubscribe();
      contentPieceTranslationSubscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => ({ campaigns, setCampaigns }), [campaigns]);
  return <CampaignContext value={value}>{children}</CampaignContext>;
};

// Custom hook to use the CampaignContext
export const useCampaigns = () => {
  const context = use(CampaignContext);
  if (!context) {
    throw new Error('useCampaigns must be used within a CampaignProvider');
  }
  return context;
};
