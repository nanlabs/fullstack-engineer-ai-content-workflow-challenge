import { Body, Controller, Param, Post } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateAiDraftDto } from './dto/generate-ai-draft.dto';
import { TranslateContentDto } from './dto/translate-content.dto';
import { SubmitReviewDto } from './dto/submit-review.dto';

@Controller('content')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post(':id/generate')
  generate(@Param('id') id: string, @Body() payload: GenerateAiDraftDto) {
    return this.aiService.generateDraft(id, payload);
  }

  @Post(':id/translate')
  translate(@Param('id') id: string, @Body() payload: TranslateContentDto) {
    return this.aiService.translateContent(id, payload);
  }

  @Post(':id/review')
  review(@Param('id') id: string, @Body() payload: SubmitReviewDto) {
    return this.aiService.submitReview(id, payload);
  }
}
