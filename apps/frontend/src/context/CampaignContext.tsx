import type { Campaign, ContentPiece, ContentPieceTranslation } from '@/lib/types';
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

type UpdateInfo<T> = {
  [K in keyof T]: T[K];
} & { _type: 'create' | 'update' | 'remove' };

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
          modelProvider
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
  subscription campaignUpdated {
    campaignUpdated {
      id
      name
      description
      createdAt
      updatedAt
      _type
      contentPieces {
        id
        reviewState
        aiGeneratedDraft
        sourceLanguage
        createdAt
        updatedAt
        translations {
          id
          modelProvider
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
  subscription contentPieceUpdated {
    contentPieceUpdated {
      id
      campaignId
      reviewState
      aiGeneratedDraft
      sourceLanguage
      createdAt
      updatedAt
      _type
      translations {
        id
        modelProvider
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
  subscription contentPieceTranslationUpdated {
    contentPieceTranslationUpdated {
      id
      modelProvider
      languageCode
      translatedTitle
      translatedDescription
      isAIGenerated
      isHumanEdited
      createdAt
      updatedAt

      _type
      campaignId
      contentPieceId
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
    const campaignObservable = client.subscribe<{ campaignUpdated: UpdateInfo<Campaign> }>({
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
          if (updatedCampaign._type === 'remove') {
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
      contentPieceUpdated: UpdateInfo<ContentPiece & { campaignId: string }>;
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
          const contentPieces = [...updatedCampaigns[campaignIndex].contentPieces];
          const contentIndex = contentPieces.findIndex((cp) => cp.id === updatedContentPiece.id);

          if (contentIndex === -1) {
            // Add new content piece
            contentPieces.push(updatedContentPiece);
          } else {
            if (updatedContentPiece._type === 'remove') {
              contentPieces.splice(contentIndex, 1);
            } else {
              // Update existing content piece
              contentPieces[contentIndex] = updatedContentPiece;
            }
          }
          updatedCampaigns[campaignIndex] = {
            ...updatedCampaigns[campaignIndex],
            contentPieces,
          };
          return updatedCampaigns;
        });
      },
    });

    // Subscribe to content piece translation updates
    const contentPieceTranslationObservable = client.subscribe<{
      contentPieceTranslationUpdated: UpdateInfo<
        ContentPieceTranslation & { campaignId: string; contentPieceId: string }
      >;
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
          if (contentIndex === -1) return prevCampaigns; // ContentPiece piece not found

          const translations = [...contentPieces[contentIndex].translations];
          const translationIndex = translations.findIndex((t) => t.id === updatedTranslation.id);

          if (translationIndex === -1) {
            // Add new translation
            translations.push(updatedTranslation);
          } else {
            if (updatedTranslation._type === 'remove') {
              translations.splice(translationIndex, 1);
            } else {
              // Update existing translation
              translations[translationIndex] = updatedTranslation;
            }
          }

          updatedCampaigns[campaignIndex] = {
            ...updatedCampaigns[campaignIndex],
            contentPieces: [
              ...contentPieces.slice(0, contentIndex),
              {
                ...contentPieces[contentIndex],
                translations,
              },
              ...contentPieces.slice(contentIndex + 1),
            ].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
          };
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
