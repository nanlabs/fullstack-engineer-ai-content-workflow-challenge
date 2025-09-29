import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { CampaignStatus } from '@prisma/client';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CampaignResponseDto } from './dto/campaign-response.dto';
import { CreateContentForCampaignDto } from '../content/dto/create-content-for-campaign.dto';
import { ContentResponseDto } from '../content/dto/content-response.dto';
import { ContentService } from '../content/content.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('campaigns')
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly contentService: ContentService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  @ApiResponse({ status: 201, type: CampaignResponseDto })
  create(
    @Body() createCampaignDto: CreateCampaignDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignsService.create(createCampaignDto, user.id);
  }

  @Get()
  @ApiOperation({ summary: 'Get campaigns with filters' })
  @ApiResponse({ status: 200, type: [CampaignResponseDto] })
  @ApiQuery({ 
    name: 'status', 
    required: false, 
    enum: CampaignStatus, 
    description: 'Filter by campaign status (DRAFT, ACTIVE, COMPLETED, ARCHIVED)' 
  })
  findAll(
    @CurrentUser() user: { id: string },
    @Query('status') status?: CampaignStatus,
  ) {
    return this.campaignsService.findAll(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign by ID' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignsService.findOne(id, user.id);
  }

  @Post(':id/content')
  @ApiOperation({ summary: 'Create content for a campaign' })
  @ApiResponse({ status: 201, type: ContentResponseDto })
  createContent(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @Body() createContentDto: CreateContentForCampaignDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.createForCampaign(campaignId, createContentDto, user.id);
  }

  @Get(':id/content')
  @ApiOperation({ summary: 'Get all content for a campaign' })
  @ApiResponse({ status: 200, type: [ContentResponseDto] })
  getCampaignContent(
    @Param('id', ParseUUIDPipe) campaignId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.contentService.findAllForCampaign(campaignId, user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update campaign by ID' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignsService.update(id, updateCampaignDto, user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete campaign by ID' })
  @ApiResponse({ status: 200, type: CampaignResponseDto })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.campaignsService.remove(id, user.id);
  }
}
