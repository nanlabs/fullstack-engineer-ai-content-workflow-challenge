import { Controller, Post, Body, HttpException, HttpStatus } from '@nestjs/common';
import { AiGenerationService } from './ai-generation.service';

@Controller('ai-generation')
export class AiGenerationController {
  constructor(private readonly aiGenerationService: AiGenerationService) {}

  @Post('generate-draft')
  async generateDraft(@Body() body: { 
    contentPieceId: string; 
    prompt: string;
    contentType?: string;
    language?: string;
  }) {
    try {
      const draft = await this.aiGenerationService.generateDraft(
        body.contentPieceId, 
        body.prompt,
        body.contentType,
        body.language
      );
      return {
        success: true,
        data: draft,
        message: 'AI draft generated successfully'
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to generate AI draft',
          error: 'AI_GENERATION_ERROR'
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
