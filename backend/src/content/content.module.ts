import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentPiece } from './content-piece.entity';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

@Module({
  imports: [TypeOrmModule.forFeature([ContentPiece])],
  controllers: [ContentController],
  providers: [ContentService],
})
export class ContentModule {}
