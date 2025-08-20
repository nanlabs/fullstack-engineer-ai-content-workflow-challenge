import { Controller, Get } from '@nestjs/common';
import { SceneService } from './scene.service';
import type { Scene } from './scene.entity';

@Controller('scene')
export class SceneController {
  constructor(private readonly sceneService: SceneService) {}

  @Get()
  findAll(): Promise<Scene[]> {
    return this.sceneService.findAll();
  }
}
