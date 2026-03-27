import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Controller('campaigns')
export class CampaignsController {
  private readonly logger = new Logger(CampaignsController.name);

  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  findAll() {
    this.logger.log('GET /campaigns');
    return this.campaignsService.findAll();
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() createCampaignDto: CreateCampaignDto) {
    this.logger.log('POST /campaigns');
    return this.campaignsService.create(createCampaignDto);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    this.logger.log(`GET /campaigns/${id}`);
    return this.campaignsService.findOne(id);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateCampaignDto: UpdateCampaignDto) {
    this.logger.log(`PUT /campaigns/${id}`);
    return this.campaignsService.update(id, updateCampaignDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string) {
    this.logger.log(`DELETE /campaigns/${id}`);
    return this.campaignsService.remove(id);
  }
}
