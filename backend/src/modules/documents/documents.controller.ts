import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { DocumentsService } from './documents.service';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload/:campaignId')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('campaignId') campaignId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    try {
      if (!file) {
        throw new HttpException(
          {
            success: false,
            message: 'No file uploaded',
            error: 'NO_FILE_UPLOADED',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate file type
      const allowedTypes = ['application/pdf', 'text/plain'];
      if (!allowedTypes.includes(file.mimetype)) {
        throw new HttpException(
          {
            success: false,
            message: 'Only PDF and TXT files are allowed',
            error: 'INVALID_FILE_TYPE',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        throw new HttpException(
          {
            success: false,
            message: 'File size must be less than 10MB',
            error: 'FILE_TOO_LARGE',
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      const document = await this.documentsService.uploadDocument(campaignId, file);

      return {
        success: true,
        data: document,
        message: 'Document uploaded and processed successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to upload document',
          error: 'UPLOAD_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('campaign/:campaignId')
  async getDocumentsByCampaign(@Param('campaignId') campaignId: string) {
    try {
      const documents = await this.documentsService.getDocumentsByCampaign(campaignId);

      return {
        success: true,
        data: documents,
        message: 'Documents retrieved successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to retrieve documents',
          error: 'RETRIEVE_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Delete(':documentId')
  async deleteDocument(@Param('documentId') documentId: string) {
    try {
      await this.documentsService.deleteDocument(documentId);

      return {
        success: true,
        message: 'Document deleted successfully',
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: error.message || 'Failed to delete document',
          error: 'DELETE_ERROR',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
