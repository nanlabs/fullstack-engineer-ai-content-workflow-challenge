import { Repository } from 'typeorm';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateMovieDto } from './dto/create-movie.dto';
import { UpdateMovieDto } from './dto/update-movie.dto';
import { Movie } from './movie.entity';

@Injectable()
export class MovieService {
  constructor(
    @InjectRepository(Movie)
    private movieRepository: Repository<Movie>,
  ) {}

  create(createMovieDto: CreateMovieDto) {
    return `This action adds a new movie`;
  }

  findAll(): Promise<Movie[]> {
    return this.movieRepository.find();
  }

  findOne(id: number) {
    return `This action returns a #${id} movie`;
  }

  update(id: number, updateMovieDto: UpdateMovieDto) {
    return `This action updates a #${id} movie`;
  }

  remove(id: number) {
    return `This action removes a #${id} movie`;
  }

  async findDetail(id: string): Promise<Movie> {
    const m = await this.movieRepository
      .createQueryBuilder('m')
      .leftJoinAndSelect('m.scenes', 's')
      .leftJoinAndSelect('s.tracks', 't')
      .leftJoinAndSelect('t.song', 'song')
      .where('m.id = :id', { id })
      .orderBy('s.name', 'ASC')
      .addOrderBy('t.startTime', 'ASC')
      .getOne();

    if (!m) throw new NotFoundException('Movie not found');

    return m as unknown as Movie;
  }
}
