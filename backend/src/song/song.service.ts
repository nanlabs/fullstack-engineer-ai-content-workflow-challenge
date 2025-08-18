import { Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateSongDto } from './dto/create-song.dto';
import { UpdateSongDto } from './dto/update-song.dto';
import { Song } from './song.entity';

@Injectable()
export class SongService {
  constructor(
    @InjectRepository(Song)
    private songRepository: Repository<Song>,
  ) {}

  create(createSongDto: CreateSongDto) {
    return 'This action adds a new song';
  }

  findAll(): Promise<Song[]> {
    return this.songRepository.find();
  }

  findOne(id: string) {
    return `This action returns a #${id} song`;
  }

  update(id: string, updateSongDto: UpdateSongDto) {
    return `This action updates a #${id} song`;
  }

  remove(id: string) {
    return `This action removes a #${id} song`;
  }
}
