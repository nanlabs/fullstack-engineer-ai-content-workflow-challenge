import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import OpenAI from 'openai';

export interface TranslationRequest {
  draftId: string;
  targetLanguages: string[];
}

export interface TranslationResult {
  language: string;
  content: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class TranslationService {
  private readonly logger = new Logger(TranslationService.name);
  private openai: OpenAI;

  // Supported languages for translation
  private readonly supportedLanguages = {
    'es': 'Spanish',
    'en': 'English', 
    'fr': 'French',
    'de': 'German',
    'it': 'Italian',
    'pt': 'Portuguese'
  };

  constructor(
    private prisma: PrismaService,
    private websocketsGateway: WebsocketsGateway,
  ) {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async translateDraft(translationRequest: TranslationRequest): Promise<TranslationResult[]> {
    const { draftId, targetLanguages } = translationRequest;

    try {
      // Get the draft with content piece and campaign context
      const draft = await this.prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          contentPiece: {
            include: {
              campaign: true,
            },
          },
        },
      });

      if (!draft) {
        throw new Error('Draft not found');
      }

      // Validate target languages
      const validLanguages = targetLanguages.filter(lang => 
        Object.keys(this.supportedLanguages).includes(lang)
      );

      if (validLanguages.length === 0) {
        throw new Error('No valid target languages provided');
      }

      // Don't translate to the same language as the original
      const languagesToTranslate = validLanguages.filter(lang => lang !== draft.language);

      if (languagesToTranslate.length === 0) {
        throw new Error('No different languages to translate to');
      }

      this.logger.log(`Starting translation for draft ${draftId} to languages: ${languagesToTranslate.join(', ')}`);

      // Notify WebSocket clients about translation start
      this.websocketsGateway.notifyTranslationStarted(draftId, languagesToTranslate);

      // Translate to each language
      const translationResults: TranslationResult[] = [];
      
      // Preserve existing translations and states
      const existingTranslations = (draft.translations as Record<string, string>) || {};
      const existingTranslationStates = (draft.translationStates as Record<string, string>) || {};
      
      const translations: Record<string, string> = { ...existingTranslations };
      const translationStates: Record<string, string> = { ...existingTranslationStates };

      for (const targetLanguage of languagesToTranslate) {
        try {
          const translation = await this.translateToLanguage(
            draft.content,
            draft.language,
            targetLanguage,
            draft.contentPiece.campaign,
            draft.contentPiece
          );

          translations[targetLanguage] = translation;
          translationStates[targetLanguage] = 'SUGGESTED_BY_AI';
          
          translationResults.push({
            language: targetLanguage,
            content: translation,
            success: true,
          });

          this.logger.log(`Successfully translated to ${targetLanguage}`);
        } catch (error) {
          this.logger.error(`Failed to translate to ${targetLanguage}:`, error);
          
          translationResults.push({
            language: targetLanguage,
            content: '',
            success: false,
            error: error.message || 'Translation failed',
          });
        }
      }

      // Update the draft with translations
      const updatedDraft = await this.prisma.draft.update({
        where: { id: draftId },
        data: {
          translations: translations,
          translationStates: translationStates,
        },
        include: {
          contentPiece: {
            include: {
              campaign: true,
            },
          },
        },
      });

      // Notify WebSocket clients about translation completion
      this.websocketsGateway.notifyTranslationCompleted(draftId, translationResults);
      
      // Also notify about the draft update so frontend can refresh the data
      this.websocketsGateway.notifyDraftUpdated(updatedDraft.contentPiece.id, updatedDraft);

      this.logger.log(`Translation completed for draft ${draftId}`);
      return translationResults;

    } catch (error) {
      this.logger.error('Error in translateDraft:', error);
      
      // Notify WebSocket clients about translation failure
      this.websocketsGateway.notifyTranslationFailed(draftId, error.message);
      
      throw new Error(`Translation failed: ${error.message}`);
    }
  }

  private async translateToLanguage(
    content: string,
    sourceLanguage: string,
    targetLanguage: string,
    campaign: any,
    contentPiece: any
  ): Promise<string> {
    const sourceLangName = this.supportedLanguages[sourceLanguage] || sourceLanguage;
    const targetLangName = this.supportedLanguages[targetLanguage] || targetLanguage;

    const systemPrompt = `You are a professional translator specializing in marketing and advertising content for ACME GLOBAL MEDIA Marketing Agency.

Your task is to translate marketing content while maintaining:
- The original tone and style
- Marketing effectiveness
- Cultural appropriateness for the target market
- Brand consistency

Context:
- Campaign: ${campaign.name}
- Content Type: ${contentPiece.contentType}
- Target Audience: Marketing professionals and consumers
- Marketing Tone: Professional yet engaging

Translate the following content from ${sourceLangName} to ${targetLangName}:`;

    const userPrompt = content;

    const completion = await this.openai.completions.create({
      model: 'gpt-3.5-turbo-instruct',
      prompt: `${systemPrompt}\n\n${userPrompt}`,
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for more consistent translations
    });

    const translatedContent = completion.choices[0]?.text?.trim() || '';
    
    if (!translatedContent) {
      throw new Error('Empty translation received from AI');
    }

    return translatedContent;
  }

  async updateDraftReviewState(draftId: string, reviewState: string): Promise<void> {
    try {
      const draft = await this.prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          contentPiece: {
            include: {
              campaign: true,
            },
          },
        },
      });

      if (!draft) {
        throw new Error('Draft not found');
      }

      await this.prisma.draft.update({
        where: { id: draftId },
        data: {
          reviewState: reviewState as any, // Cast to ReviewState enum
        },
      });

      // Notify WebSocket clients about the draft update
      this.websocketsGateway.notifyDraftUpdated(draft.contentPiece.id, {
        ...draft,
        reviewState: reviewState,
      });

      this.logger.log(`Updated draft review state to ${reviewState} for draft ${draftId}`);
    } catch (error) {
      this.logger.error('Error updating draft review state:', error);
      throw error;
    }
  }


  getSupportedLanguages(): Record<string, string> {
    return this.supportedLanguages;
  }

  async updateDraftContent(draftId: string, content: string) {
    const draft = await this.prisma.draft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    const updatedDraft = await this.prisma.draft.update({
      where: { id: draftId },
      data: {
        content: content,
        updatedAt: new Date(),
      },
    });

    this.websocketsGateway.notifyDraftUpdated(draft.contentPieceId, updatedDraft);
    return updatedDraft;
  }

  async updateTranslationContent(draftId: string, language: string, content: string) {
    const draft = await this.prisma.draft.findUnique({
      where: { id: draftId },
    });

    if (!draft) {
      throw new Error('Draft not found');
    }

    const currentTranslations = (draft.translations || {}) as Record<string, string>;
    currentTranslations[language] = content;

    const updatedDraft = await this.prisma.draft.update({
      where: { id: draftId },
      data: {
        translations: currentTranslations,
        updatedAt: new Date(),
      },
    });

    this.websocketsGateway.notifyDraftUpdated(draft.contentPieceId, updatedDraft);
    return updatedDraft;
  }

  async deleteTranslation(draftId: string, language: string) {
    try {
      const draft = await this.prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          contentPiece: {
            include: {
              campaign: true,
            },
          },
        },
      });

      if (!draft) {
        throw new Error('Draft not found');
      }

      if (!draft.translations || !draft.translationStates) {
        throw new Error('No translations found for this draft');
      }

      const translations = draft.translations as Record<string, string>;
      const translationStates = draft.translationStates as Record<string, string>;

      // Remove the specific language from both translations and states
      delete translations[language];
      delete translationStates[language];

      const updatedDraft = await this.prisma.draft.update({
        where: { id: draftId },
        data: {
          translations: translations,
          translationStates: translationStates,
          updatedAt: new Date(),
        },
        include: {
          contentPiece: {
            include: {
              campaign: true,
            },
          },
        },
      });

      // Notify WebSocket clients about the translation deletion
      this.websocketsGateway.notifyDraftUpdated(draft.contentPiece.id, updatedDraft);

      this.logger.log(`Deleted translation for ${language} from draft ${draftId}`);
      return updatedDraft;
    } catch (error) {
      this.logger.error('Error deleting translation:', error);
      throw error;
    }
  }

  async deleteDraft(draftId: string) {
    try {
      const draft = await this.prisma.draft.findUnique({
        where: { id: draftId },
        include: {
          contentPiece: {
            include: {
              campaign: true,
            },
          },
        },
      });

      if (!draft) {
        throw new Error('Draft not found');
      }

      // Delete the draft
      await this.prisma.draft.delete({
        where: { id: draftId },
      });

      // Notify WebSocket clients about the draft deletion
      this.websocketsGateway.notifyDraftDeleted(draft.contentPiece.id, draftId);

      this.logger.log(`Deleted draft ${draftId}`);
      return { draftId, contentPieceId: draft.contentPiece.id };
    } catch (error) {
      this.logger.error('Error deleting draft:', error);
      throw error;
    }
  }
}
