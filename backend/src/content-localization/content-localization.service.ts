import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReviewStatus } from '../status-enum';
import { ContentLocalization } from './content-localizations.entity';
import { UpdateLocalizationContentDto } from './dto/update-localization-content.dto';
import { UpdateLocalizationStatusDto } from './dto/update-localization-status.dto';

@Injectable()
export class ContentLocalizationService {
  constructor(
    @InjectRepository(ContentLocalization)
    private readonly localizationRepo: Repository<ContentLocalization>,
  ) {}

  async updateStatus(
    id: string,
    payload: UpdateLocalizationStatusDto,
  ): Promise<ContentLocalization> {
    const localization = await this.getByIdOrThrow(id);
    localization.status = payload.status;
    return this.localizationRepo.save(localization);
  }

  async updateContent(
    id: string,
    payload: UpdateLocalizationContentDto,
  ): Promise<ContentLocalization> {
    const localization = await this.getByIdOrThrow(id);

    if (payload.titleSuggestion !== undefined) {
      localization.titleSuggestion = payload.titleSuggestion;
    }

    if (payload.bodySuggestion !== undefined) {
      localization.bodySuggestion = payload.bodySuggestion;
    }

    // Human edits imply the AI suggestion has been reviewed.
    localization.status = ReviewStatus.REVIEWED;

    return this.localizationRepo.save(localization);
  }

  private async getByIdOrThrow(id: string): Promise<ContentLocalization> {
    const localization = await this.localizationRepo.findOne({
      where: { id },
      relations: { contentPiece: true },
    });

    if (!localization) {
      throw new NotFoundException(`Content localization with id "${id}" not found`);
    }

    return localization;
  }
}
