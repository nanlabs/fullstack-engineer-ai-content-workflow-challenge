import { Controller, Get } from '@nestjs/common';
import { TrackService } from './track.service';
import type { Track } from './track.entity';

@Controller('track')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Get()
  findAll(): Promise<Track[]> {
    return this.trackService.findAll();
  }
}
