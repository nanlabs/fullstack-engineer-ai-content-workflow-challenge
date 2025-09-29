import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { ContentType } from '@prisma/client';
import { GenerateContentDto } from './dto/generate-content.dto';
import { TranslateContentDto } from './dto/translate-content.dto';
import { AiResponseDto } from './dto/ai-response.dto';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly openai: OpenAI;

  private readonly contentPrompts: Record<ContentType, string> = {
    SOCIAL_POST: 'Create an engaging social media post with emojis and hashtags',
    EMAIL_SUBJECT: 'Create a compelling email subject line',
    EMAIL_BODY: 'Write a professional email body',
    PRODUCT_DESCRIPTION: 'Write a product description highlighting key features',
    BLOG_POST: 'Create a blog post with introduction and conclusion',
    AD_COPY: 'Write advertising copy with a call-to-action',
    AD_HEADLINE: 'Create a catchy headline'
  };

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    
    if (!apiKey) {
      throw new Error('OpenAI API key is required');
    }

    this.openai = new OpenAI({ apiKey });
    this.logger.log('AI Service initialized');
  }

  async generateContent(options: GenerateContentDto): Promise<AiResponseDto> {
    const { prompt, contentType, model = 'gpt-3.5-turbo' } = options;

    if (!prompt || prompt.trim().length === 0) {
      throw new BadRequestException('Prompt is required');
    }

    const systemPrompt = this.contentPrompts[contentType];
    const fullPrompt = `${systemPrompt}: ${prompt}`;

    this.logger.log(`Generating ${contentType} content`);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new InternalServerErrorException('No content generated');
      }

      return {
        content: content.trim(),
        model,
        tokensUsed: response.usage?.total_tokens || 0,
        promptUsed: fullPrompt,
      };
    } catch (error) {
      this.logger.error(`AI generation failed: ${error.message}`);
      throw new InternalServerErrorException('AI service unavailable');
    }
  }

  async translateContent(options: TranslateContentDto): Promise<AiResponseDto> {
    const { content, targetLanguage, context, model = 'gpt-3.5-turbo' } = options;

    if (!content || !targetLanguage) {
      throw new BadRequestException('Content and target language are required');
    }

    let systemPrompt = `Translate this content to ${targetLanguage}. Keep the same tone and style.`;
    
    if (context) {
      systemPrompt += ` Additional context: ${context}. Please adapt the translation accordingly to fit this specific context and localization.`;
    }

    const fullPrompt = `${systemPrompt} Content: ${content}`;

    this.logger.log(`Translating to ${targetLanguage}${context ? ` with context: ${context}` : ''}`);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content }
        ]
      });

      const translatedContent = response.choices[0]?.message?.content;
      if (!translatedContent) {
        throw new InternalServerErrorException('Translation failed');
      }

      return {
        content: translatedContent.trim(),
        model,
        tokensUsed: response.usage?.total_tokens || 0,
        promptUsed: fullPrompt,
      };
    } catch (error) {
      this.logger.error(`Translation failed: ${error.message}`);
      throw new InternalServerErrorException('Translation service unavailable');
    }
  }

  async regenerateContent(options: {
    originalPrompt: string;
    currentContent: string;
    feedback: string;
    contentType: ContentType;
    model?: string;
  }): Promise<AiResponseDto> {
    const { originalPrompt, currentContent, feedback, contentType, model = 'gpt-3.5-turbo' } = options;

    if (!feedback || feedback.trim().length === 0) {
      throw new BadRequestException('Feedback is required for regeneration');
    }

    const systemPrompt = this.contentPrompts[contentType];
    const improvedPrompt = `${systemPrompt}

ORIGINAL REQUEST: ${originalPrompt}

CURRENT VERSION: ${currentContent}

USER FEEDBACK: ${feedback}

Please create an improved version that addresses the user's feedback while maintaining the original intent.`;

    this.logger.log(`Regenerating ${contentType} content with feedback`);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: improvedPrompt }
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new InternalServerErrorException('No content generated');
      }

      return {
        content: content.trim(),
        model,
        tokensUsed: response.usage?.total_tokens || 0,
        promptUsed: improvedPrompt,
      };
    } catch (error) {
      this.logger.error(`AI regeneration failed: ${error.message}`);
      throw new InternalServerErrorException('AI service unavailable');
    }
  }

  async regenerateTranslation(options: {
    originalContent: string;
    currentTranslation: string;
    targetLanguage: string;
    context?: string;
    feedback: string;
    model?: string;
  }): Promise<AiResponseDto> {
    const { originalContent, currentTranslation, targetLanguage, context, feedback, model = 'gpt-3.5-turbo' } = options;

    if (!feedback || feedback.trim().length === 0) {
      throw new BadRequestException('Feedback is required for regeneration');
    }

    let systemPrompt = `Translate content to ${targetLanguage}. Keep the same tone and style.`;
    
    if (context) {
      systemPrompt += ` Context: ${context}.`;
    }

    const improvedPrompt = `${systemPrompt}

ORIGINAL CONTENT: ${originalContent}

CURRENT TRANSLATION: ${currentTranslation}

USER FEEDBACK: ${feedback}

Please create an improved translation that addresses the user's feedback while maintaining accuracy and cultural appropriateness.`;

    this.logger.log(`Regenerating translation to ${targetLanguage} with feedback`);

    try {
      const response = await this.openai.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: improvedPrompt }
        ],
      });

      const translatedContent = response.choices[0]?.message?.content;
      if (!translatedContent) {
        throw new InternalServerErrorException('Translation regeneration failed');
      }

      return {
        content: translatedContent.trim(),
        model,
        tokensUsed: response.usage?.total_tokens || 0,
        promptUsed: improvedPrompt,
      };
    } catch (error) {
      this.logger.error(`Translation regeneration failed: ${error.message}`);
      throw new InternalServerErrorException('Translation service unavailable');
    }
  }
}
