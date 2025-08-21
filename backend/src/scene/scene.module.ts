import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Scene } from './scene.entity';
import { SceneService } from './scene.service';

@Module({
  imports: [TypeOrmModule.forFeature([Scene])],
  providers: [SceneService],
})
export class SceneModule {}
