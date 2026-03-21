import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CampaignsService } from './campaigns.service';
import { CreateCampaignDto, UpdateCampaignDto } from './campaigns.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Campaigns')
@ApiBearerAuth()
@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new campaign' })
  create(@Body() dto: CreateCampaignDto, @Request() req: any) {
    return this.campaignsService.create(dto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all campaigns with content summaries' })
  findAll(@Request() req: any) {
    return this.campaignsService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get campaign detail with content pieces' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.campaignsService.findOne(id, req.user.id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a campaign' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCampaignDto,
    @Request() req: any,
  ) {
    return this.campaignsService.update(id, dto, req.user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a campaign' })
  remove(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.campaignsService.remove(id, req.user.id);
  }
}
