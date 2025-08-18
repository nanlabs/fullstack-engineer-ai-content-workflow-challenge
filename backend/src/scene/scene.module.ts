import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scene } from './scene.entity';
import { SceneService } from './scene.service';
import { SceneController } from './scene.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Scene])],
  controllers: [SceneController],
  providers: [SceneService],
})
export class SceneModule {}
