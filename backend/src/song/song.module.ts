import { Module } from '@nestjs/common';
import { SongService } from './song.service';
import { SongController } from './song.controller';

@Module({
  controllers: [SongController],
  providers: [SongService],
})
export class SongModule {}
