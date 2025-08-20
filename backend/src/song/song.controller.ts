import { Controller, Get } from '@nestjs/common';
import { SongService } from './song.service';
import type { Song } from './song.entity';

@Controller('song')
export class SongController {
  constructor(private readonly songService: SongService) {}

  @Get()
  findAll(): Promise<Song[]> {
    return this.songService.findAll();
  }
}
