import { Controller, Post, Body, Patch, Param, Get, Delete, HttpException, HttpStatus } from '@nestjs/common';
import { TranslationService, TranslationRequest } from './translation.service';

@Controller('translation')
export class TranslationController {
  constructor(private readonly translationService: TranslationService) {}

  @Post('translate')
  async translateDraft(@Body() body: TranslationRequest) {
    try {
      const results = await this.translationService.translateDraft(body);
      return {
        success: true,
        data: results,
        message: 'Translation completed successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to translate draft',
          error: 'TRANSLATION_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':draftId/review-state/:state')
  async updateDraftReviewState(
    @Param('draftId') draftId: string,
    @Param('state') state: string
  ) {
    try {
      await this.translationService.updateDraftReviewState(draftId, state);
      return {
        success: true,
        message: `Draft review state updated to ${state}`
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update draft review state',
          error: 'DRAFT_REVIEW_STATE_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }


  @Get('supported-languages')
  async getSupportedLanguages() {
    try {
      const languages = this.translationService.getSupportedLanguages();
      return {
        success: true,
        data: languages,
        message: 'Supported languages retrieved successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to get supported languages',
          error: 'LANGUAGES_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch(':draftId/content')
  async updateDraftContent(
    @Param('draftId') draftId: string,
    @Body('content') content: string,
  ) {
    try {
      const updatedDraft = await this.translationService.updateDraftContent(draftId, content);
      return {
        success: true,
        data: updatedDraft,
        message: 'Draft content updated successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update draft content',
          error: 'UPDATE_DRAFT_CONTENT_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Patch(':draftId/translation/:language')
  async updateTranslationContent(
    @Param('draftId') draftId: string,
    @Param('language') language: string,
    @Body('content') content: string,
  ) {
    try {
      const updatedDraft = await this.translationService.updateTranslationContent(draftId, language, content);
      return {
        success: true,
        data: updatedDraft,
        message: `Translation content for ${language} updated successfully`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to update translation content',
          error: 'UPDATE_TRANSLATION_CONTENT_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':draftId/translation/:language')
  async deleteTranslation(
    @Param('draftId') draftId: string,
    @Param('language') language: string
  ) {
    try {
      const updatedDraft = await this.translationService.deleteTranslation(draftId, language);
      return {
        success: true,
        data: updatedDraft,
        message: `Translation for ${language} deleted successfully`,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete translation',
          error: 'DELETE_TRANSLATION_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':draftId')
  async deleteDraft(@Param('draftId') draftId: string) {
    try {
      const result = await this.translationService.deleteDraft(draftId);
      return {
        success: true,
        data: result,
        message: 'Draft deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete draft',
          error: 'DELETE_DRAFT_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
