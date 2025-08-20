import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Scene } from './scene.entity';

@Injectable()
export class SceneService {
  constructor(
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
  ) {}

  findAll(): Promise<Scene[]> {
    return this.sceneRepository.find();
  }
}
