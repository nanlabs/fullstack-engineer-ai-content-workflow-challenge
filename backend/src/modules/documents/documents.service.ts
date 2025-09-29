import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import * as fs from 'fs';
import * as path from 'path';
import * as pdf from 'pdf-parse';

export interface DocumentChunk {
  text: string;
  embedding?: number[];
  metadata: {
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
}

export interface ProcessedDocument {
  id: string;
  filename: string;
  originalName: string;
  fileType: string;
  fileSize: number;
  content: string;
  chunks: DocumentChunk[];
  uploadedAt: Date;
  processedAt: Date;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadDir = path.join(process.cwd(), 'uploads');

  constructor(
    private prisma: PrismaService,
    private websocketsGateway: WebsocketsGateway,
  ) {
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async uploadDocument(
    campaignId: string,
    file: Express.Multer.File,
  ): Promise<ProcessedDocument> {
    try {
      this.logger.log(`Uploading document: ${file.originalname} for campaign: ${campaignId}`);

      // Verify campaign exists
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
      });

      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // Generate unique filename
      const fileExtension = path.extname(file.originalname);
      const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExtension}`;
      const filePath = path.join(this.uploadDir, filename);

      // Save file to disk
      fs.writeFileSync(filePath, file.buffer);

      // Extract text content based on file type
      let content: string;
      const fileType = this.getFileType(file.originalname);

      if (fileType === 'pdf') {
        content = await this.extractPdfText(filePath);
      } else if (fileType === 'txt') {
        content = fs.readFileSync(filePath, 'utf-8');
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Create document chunks
      const chunks = this.createDocumentChunks(content);

      // Save document to database
      const document = await this.prisma.document.create({
        data: {
          filename,
          originalName: file.originalname,
          fileType,
          fileSize: file.size,
          content,
          chunks: chunks as any, // Store chunks as JSON
          processedAt: new Date(),
          campaignId,
        },
      });

      // Clean up temporary file
      fs.unlinkSync(filePath);

      // Notify WebSocket clients
      this.websocketsGateway.notifyDocumentUploaded(campaignId, document);

      this.logger.log(`Document uploaded successfully: ${document.id}`);
      return {
        ...document,
        chunks: document.chunks as unknown as DocumentChunk[],
      } as ProcessedDocument;
    } catch (error) {
      this.logger.error('Error uploading document:', error);
      throw error;
    }
  }

  async getDocumentsByCampaign(campaignId: string): Promise<ProcessedDocument[]> {
    try {
      const documents = await this.prisma.document.findMany({
        where: { campaignId },
        orderBy: { uploadedAt: 'desc' },
      });

      return documents.map(doc => ({
        ...doc,
        chunks: doc.chunks as unknown as DocumentChunk[],
      })) as ProcessedDocument[];
    } catch (error) {
      this.logger.error('Error fetching documents:', error);
      throw error;
    }
  }

  async deleteDocument(documentId: string): Promise<void> {
    try {
      const document = await this.prisma.document.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Delete file from disk if it exists
      const filePath = path.join(this.uploadDir, document.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      // Delete from database
      await this.prisma.document.delete({
        where: { id: documentId },
      });

      // Notify WebSocket clients
      this.websocketsGateway.notifyDocumentDeleted(document.campaignId, documentId);

      this.logger.log(`Document deleted successfully: ${documentId}`);
    } catch (error) {
      this.logger.error('Error deleting document:', error);
      throw error;
    }
  }

  async getRelevantDocumentChunks(
    campaignId: string,
    query: string,
    maxChunks: number = 3,
  ): Promise<DocumentChunk[]> {
    try {
      const documents = await this.prisma.document.findMany({
        where: { campaignId },
      });

      if (documents.length === 0) {
        return [];
      }

      // For now, return the first few chunks from all documents
      // In a production system, you would use vector similarity search
      const allChunks: DocumentChunk[] = [];
      
      documents.forEach((doc) => {
        if (doc.chunks) {
          const chunks = doc.chunks as unknown as DocumentChunk[];
          allChunks.push(...chunks.slice(0, maxChunks));
        }
      });

      return allChunks.slice(0, maxChunks);
    } catch (error) {
      this.logger.error('Error getting relevant document chunks:', error);
      return [];
    }
  }

  private getFileType(filename: string): string {
    const extension = path.extname(filename).toLowerCase();
    switch (extension) {
      case '.pdf':
        return 'pdf';
      case '.txt':
        return 'txt';
      default:
        throw new Error(`Unsupported file extension: ${extension}`);
    }
  }

  private async extractPdfText(filePath: string): Promise<string> {
    try {
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    } catch (error) {
      this.logger.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  private createDocumentChunks(content: string, chunkSize: number = 1000): DocumentChunk[] {
    const chunks: DocumentChunk[] = [];
    const words = content.split(/\s+/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    let startChar = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + word;

      if (potentialChunk.length > chunkSize && currentChunk) {
        // Save current chunk
        chunks.push({
          text: currentChunk.trim(),
          metadata: {
            chunkIndex,
            startChar,
            endChar: startChar + currentChunk.length,
          },
        });

        // Start new chunk
        startChar += currentChunk.length + 1;
        currentChunk = word;
        chunkIndex++;
      } else {
        currentChunk = potentialChunk;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim()) {
      chunks.push({
        text: currentChunk.trim(),
        metadata: {
          chunkIndex,
          startChar,
          endChar: startChar + currentChunk.length,
        },
      });
    }

    return chunks;
  }
}
