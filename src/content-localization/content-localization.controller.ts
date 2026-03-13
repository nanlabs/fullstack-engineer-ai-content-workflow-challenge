import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { ContentLocalization } from './content-localizations.entity';
import { ContentLocalizationService } from './content-localization.service';
import { UpdateLocalizationContentDto } from './dto/update-localization-content.dto';
import { UpdateLocalizationStatusDto } from './dto/update-localization-status.dto';

@ApiTags('content-localizations')
@Controller('content-localizations')
export class ContentLocalizationController {
  constructor(private readonly localizationService: ContentLocalizationService) {}

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update review status for a localization' })
  @ApiParam({ name: 'id', description: 'Localization UUID' })
  @ApiResponse({ status: 200, description: 'Localization status updated' })
  updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateLocalizationStatusDto,
  ): Promise<ContentLocalization> {
    return this.localizationService.updateStatus(id, body);
  }

  @Patch(':id/content')
  @ApiOperation({ summary: 'Edit generated content and save as reviewed' })
  @ApiParam({ name: 'id', description: 'Localization UUID' })
  @ApiResponse({ status: 200, description: 'Localization content updated' })
  updateContent(
    @Param('id') id: string,
    @Body() body: UpdateLocalizationContentDto,
  ): Promise<ContentLocalization> {
    return this.localizationService.updateContent(id, body);
  }
}
