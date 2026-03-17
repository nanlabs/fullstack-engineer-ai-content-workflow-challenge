import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AiService } from './ai.service';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Get('models')
  @ApiOperation({ summary: 'List available models by provider' })
  @ApiQuery({ name: 'provider', required: true, example: 'openai' })
  @ApiResponse({ status: 200, description: 'Models fetched successfully' })
  getModels(@Query('provider') provider: string): Promise<Array<{ id: string; label: string }>> {
    return this.aiService.getModelsByProvider(provider);
  }
}
