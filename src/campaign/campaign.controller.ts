import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Campaign } from './campaign.entity';
import { CampaignService } from './campaign.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignController {
  constructor(private readonly campaignService: CampaignService) {}

  @Post()
  @ApiOperation({ summary: 'Create a campaign from frontend topic' })
  @ApiResponse({ status: 201, description: 'Campaign created' })
  create(@Body() body: CreateCampaignDto): Promise<Campaign> {
    return this.campaignService.createCampaign(body);
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns' })
  findAll(): Promise<Campaign[]> {
    return this.campaignService.getCampaigns();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by id' })
  @ApiParam({ name: 'id', description: 'Campaign UUID' })
  findById(@Param('id') id: string): Promise<Campaign> {
    return this.campaignService.getCampaignById(id);
  }
}
