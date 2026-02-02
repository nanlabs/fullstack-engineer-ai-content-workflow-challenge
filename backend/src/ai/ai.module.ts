import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPiece } from '../content/content-piece.entity';
import { WebsocketModule } from '../websocket/websocket.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentPiece]), WebsocketModule],
  controllers: [AiController],
  providers: [AiService],
})
export class AiModule {}
