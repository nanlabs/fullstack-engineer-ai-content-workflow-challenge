import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSceneDto } from './dto/create-scene.dto';
import { UpdateSceneDto } from './dto/update-scene.dto';
import { Scene } from './scene.entity';

@Injectable()
export class SceneService {
  constructor(
    @InjectRepository(Scene)
    private sceneRepository: Repository<Scene>,
  ) {}

  create(createSceneDto: CreateSceneDto) {
    return 'This action adds a new scene';
  }

  findAll(): Promise<Scene[]> {
    return this.sceneRepository.find();
  }

  findOne(id: string) {
    return `This action returns a #${id} scene`;
  }

  update(id: string, updateSceneDto: UpdateSceneDto) {
    return `This action updates a #${id} scene`;
  }

  remove(id: string) {
    return `This action removes a #${id} scene`;
  }
}
