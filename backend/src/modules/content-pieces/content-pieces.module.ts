import { Module } from '@nestjs/common';
import { ContentPiecesController } from './content-pieces.controller';
import { ContentPiecesService } from './content-pieces.service';
import { WebsocketsModule } from '../websockets/websockets.module';

@Module({
  imports: [WebsocketsModule],
  controllers: [ContentPiecesController],
  providers: [ContentPiecesService],
  exports: [ContentPiecesService],
})
export class ContentPiecesModule {}
