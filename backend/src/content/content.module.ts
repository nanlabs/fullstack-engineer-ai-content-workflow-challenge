import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPiece } from './content-piece.entity';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [TypeOrmModule.forFeature([ContentPiece]), WebsocketModule],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
