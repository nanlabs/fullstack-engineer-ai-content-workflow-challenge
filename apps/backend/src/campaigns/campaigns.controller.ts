import { Controller, Get, Post, Body, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBody, ApiParam } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { Campaign } from './campaign.entity';

@ApiTags('campaigns')
@Controller('campaigns')
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  async create(@Body() createCampaignDto: CreateCampaignDto): Promise<Campaign> {
    return this.campaignsService.create(createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all campaigns' })
  async findAll(): Promise<Campaign[]> {
    // This endpoint returns a list of all campaigns.
    return this.campaignsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a campaign by ID' })
  @ApiParam({ name: 'id', description: 'The ID of the campaign' })
  async findOne(@Param('id') id: string): Promise<Campaign> {
    // This endpoint returns a single campaign by its ID.
    try {
      return await this.campaignsService.findOne(id);
    } catch (error) {
      // Handle the case where the campaign is not found.
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error;
    }
  }
}
