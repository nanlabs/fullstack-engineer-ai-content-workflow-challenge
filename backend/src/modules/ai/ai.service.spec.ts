import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AiService } from './ai.service';
import { ContentType } from '@prisma/client';
import { GenerateContentDto } from './dto/generate-content.dto';
import { TranslateContentDto } from './dto/translate-content.dto';

// Mock OpenAI module
jest.mock('openai', () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('AiService', () => {
  let service: AiService;
  let configService: ConfigService;
  let mockOpenAI: any;

  const mockConfigService = {
    get: jest.fn().mockReturnValue('test-api-key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    configService = module.get<ConfigService>(ConfigService);
    
    // Get the mocked OpenAI instance
    mockOpenAI = (service as any).openai;
    
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should throw error when OpenAI API key is missing', async () => {
    mockConfigService.get.mockReturnValueOnce(undefined);

    await expect(async () => {
      await Test.createTestingModule({
        providers: [
          AiService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();
    }).rejects.toThrow('OpenAI API key is required');
  });

  describe('generateContent', () => {
    const generateDto: GenerateContentDto = {
      prompt: 'Create a social media post about our product',
      contentType: ContentType.SOCIAL_POST,
      model: 'gpt-4',
    };

    const mockOpenAIResponse = {
      choices: [
        {
          message: {
            content: '🚀 Check out our amazing new product! #innovation #tech',
          },
        },
      ],
      usage: {
        total_tokens: 150,
      },
    };

    it('should generate content successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      const result = await service.generateContent(generateDto);

      expect(result).toEqual({
        content: '🚀 Check out our amazing new product! #innovation #tech',
        model: 'gpt-4',
        tokensUsed: 150,
        promptUsed: 'Create an engaging social media post with emojis and hashtags: Create a social media post about our product',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Create an engaging social media post with emojis and hashtags' },
          { role: 'user', content: 'Create a social media post about our product' }
        ]
      });
    });

    it('should use default model when not specified', async () => {
      const dtoWithoutModel = { ...generateDto };
      delete dtoWithoutModel.model;
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      const result = await service.generateContent(dtoWithoutModel);

      expect(result.model).toBe('gpt-3.5-turbo');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-3.5-turbo',
        messages: expect.any(Array),
      });
    });

    it('should handle different content types', async () => {
      const emailSubjectDto = {
        ...generateDto,
        contentType: ContentType.EMAIL_SUBJECT,
      };

      mockOpenAI.chat.completions.create.mockResolvedValue(mockOpenAIResponse);

      await service.generateContent(emailSubjectDto);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Create a compelling email subject line' },
          { role: 'user', content: generateDto.prompt }
        ]
      });
    });

    it('should throw BadRequestException for empty prompt', async () => {
      const emptyPromptDto = { ...generateDto, prompt: '' };

      await expect(service.generateContent(emptyPromptDto)).rejects.toThrow(
        new BadRequestException('Prompt is required')
      );
    });

    it('should throw BadRequestException for whitespace-only prompt', async () => {
      const whitespacePromptDto = { ...generateDto, prompt: '   ' };

      await expect(service.generateContent(whitespacePromptDto)).rejects.toThrow(
        new BadRequestException('Prompt is required')
      );
    });

    it('should throw InternalServerErrorException when no content is generated', async () => {
      const emptyResponse = {
        choices: [{ message: { content: null } }],
        usage: { total_tokens: 0 },
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(emptyResponse);

      await expect(service.generateContent(generateDto)).rejects.toThrow(
        new InternalServerErrorException('AI service unavailable')
      );
    });

    it('should throw InternalServerErrorException when OpenAI API fails', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      await expect(service.generateContent(generateDto)).rejects.toThrow(
        new InternalServerErrorException('AI service unavailable')
      );
    });

    it('should handle missing usage information', async () => {
      const responseWithoutUsage = {
        choices: [{ message: { content: 'Generated content' } }],
        // No usage field
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(responseWithoutUsage);

      const result = await service.generateContent(generateDto);

      expect(result.tokensUsed).toBe(0);
    });
  });

  describe('translateContent', () => {
    const translateDto: TranslateContentDto = {
      content: 'Hello, this is a test message',
      targetLanguage: 'Spanish',
      context: 'Marketing email',
      model: 'gpt-4',
    };

    const mockTranslationResponse = {
      choices: [
        {
          message: {
            content: 'Hola, este es un mensaje de prueba',
          },
        },
      ],
      usage: {
        total_tokens: 80,
      },
    };

    it('should translate content successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockTranslationResponse);

      const result = await service.translateContent(translateDto);

      expect(result).toEqual({
        content: 'Hola, este es un mensaje de prueba',
        model: 'gpt-4',
        tokensUsed: 80,
        promptUsed: 'Translate this content to Spanish. Keep the same tone and style. Additional context: Marketing email. Please adapt the translation accordingly to fit this specific context and localization. Content: Hello, this is a test message',
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'Translate this content to Spanish. Keep the same tone and style. Additional context: Marketing email. Please adapt the translation accordingly to fit this specific context and localization.' 
          },
          { role: 'user', content: 'Hello, this is a test message' }
        ]
      });
    });

    it('should translate without context', async () => {
      const dtoWithoutContext = { ...translateDto };
      delete dtoWithoutContext.context;
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockTranslationResponse);

      await service.translateContent(dtoWithoutContext);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'Translate this content to Spanish. Keep the same tone and style.' 
          },
          { role: 'user', content: 'Hello, this is a test message' }
        ]
      });
    });

    it('should use default model when not specified', async () => {
      const dtoWithoutModel = { ...translateDto };
      delete dtoWithoutModel.model;
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockTranslationResponse);

      const result = await service.translateContent(dtoWithoutModel);

      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('should throw BadRequestException for missing content', async () => {
      const invalidDto = { ...translateDto, content: undefined };

      await expect(service.translateContent(invalidDto)).rejects.toThrow(
        new BadRequestException('Content and target language are required')
      );
    });

    it('should throw BadRequestException for missing target language', async () => {
      const invalidDto = { ...translateDto, targetLanguage: undefined };

      await expect(service.translateContent(invalidDto)).rejects.toThrow(
        new BadRequestException('Content and target language are required')
      );
    });

    it('should throw InternalServerErrorException when translation fails', async () => {
      const emptyResponse = {
        choices: [{ message: { content: null } }],
        usage: { total_tokens: 0 },
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(emptyResponse);

      await expect(service.translateContent(translateDto)).rejects.toThrow(
        new InternalServerErrorException('Translation service unavailable')
      );
    });

    it('should handle API errors', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Translation API Error'));

      await expect(service.translateContent(translateDto)).rejects.toThrow(
        new InternalServerErrorException('Translation service unavailable')
      );
    });
  });

  describe('regenerateContent', () => {
    const regenerateOptions = {
      originalPrompt: 'Create a social media post',
      currentContent: 'Old social media post content',
      feedback: 'Make it more engaging and add emojis',
      contentType: ContentType.SOCIAL_POST,
      model: 'gpt-4',
    };

    const mockRegenerateResponse = {
      choices: [
        {
          message: {
            content: '🚀 New and improved social media post! ✨ #awesome',
          },
        },
      ],
      usage: {
        total_tokens: 120,
      },
    };

    it('should regenerate content successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockRegenerateResponse);

      const result = await service.regenerateContent(regenerateOptions);

      expect(result).toEqual({
        content: '🚀 New and improved social media post! ✨ #awesome',
        model: 'gpt-4',
        tokensUsed: 120,
        promptUsed: expect.stringContaining('ORIGINAL REQUEST: Create a social media post'),
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'Create an engaging social media post with emojis and hashtags' },
          { role: 'user', content: expect.stringContaining('USER FEEDBACK: Make it more engaging and add emojis') }
        ]
      });
    });

    it('should use default model when not specified', async () => {
      const optionsWithoutModel = { ...regenerateOptions };
      delete optionsWithoutModel.model;
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockRegenerateResponse);

      const result = await service.regenerateContent(optionsWithoutModel);

      expect(result.model).toBe('gpt-3.5-turbo');
    });

    it('should throw BadRequestException for empty feedback', async () => {
      const optionsWithoutFeedback = { ...regenerateOptions, feedback: '' };

      await expect(service.regenerateContent(optionsWithoutFeedback)).rejects.toThrow(
        new BadRequestException('Feedback is required for regeneration')
      );
    });

    it('should throw BadRequestException for whitespace-only feedback', async () => {
      const optionsWithWhitespaceFeedback = { ...regenerateOptions, feedback: '   ' };

      await expect(service.regenerateContent(optionsWithWhitespaceFeedback)).rejects.toThrow(
        new BadRequestException('Feedback is required for regeneration')
      );
    });

    it('should handle API errors during regeneration', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Regeneration failed'));

      await expect(service.regenerateContent(regenerateOptions)).rejects.toThrow(
        new InternalServerErrorException('AI service unavailable')
      );
    });

    it('should throw error when no content is generated', async () => {
      const emptyResponse = {
        choices: [{ message: { content: null } }],
        usage: { total_tokens: 0 },
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(emptyResponse);

      await expect(service.regenerateContent(regenerateOptions)).rejects.toThrow(
        new InternalServerErrorException('AI service unavailable')
      );
    });
  });

  describe('regenerateTranslation', () => {
    const regenerateTranslationOptions = {
      originalContent: 'Hello world',
      currentTranslation: 'Hola mundo',
      targetLanguage: 'Spanish',
      context: 'Casual greeting',
      feedback: 'Make it more formal',
      model: 'gpt-4',
    };

    const mockRegenerateTranslationResponse = {
      choices: [
        {
          message: {
            content: 'Buenos días, mundo',
          },
        },
      ],
      usage: {
        total_tokens: 90,
      },
    };

    it('should regenerate translation successfully', async () => {
      mockOpenAI.chat.completions.create.mockResolvedValue(mockRegenerateTranslationResponse);

      const result = await service.regenerateTranslation(regenerateTranslationOptions);

      expect(result).toEqual({
        content: 'Buenos días, mundo',
        model: 'gpt-4',
        tokensUsed: 90,
        promptUsed: expect.stringContaining('USER FEEDBACK: Make it more formal'),
      });

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'Translate content to Spanish. Keep the same tone and style. Context: Casual greeting.' 
          },
          { 
            role: 'user', 
            content: expect.stringContaining('CURRENT TRANSLATION: Hola mundo') 
          }
        ]
      });
    });

    it('should regenerate translation without context', async () => {
      const optionsWithoutContext = { ...regenerateTranslationOptions };
      delete optionsWithoutContext.context;
      
      mockOpenAI.chat.completions.create.mockResolvedValue(mockRegenerateTranslationResponse);

      await service.regenerateTranslation(optionsWithoutContext);

      expect(mockOpenAI.chat.completions.create).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages: [
          { 
            role: 'system', 
            content: 'Translate content to Spanish. Keep the same tone and style.' 
          },
          { role: 'user', content: expect.any(String) }
        ]
      });
    });

    it('should throw BadRequestException for empty feedback', async () => {
      const optionsWithoutFeedback = { ...regenerateTranslationOptions, feedback: '' };

      await expect(service.regenerateTranslation(optionsWithoutFeedback)).rejects.toThrow(
        new BadRequestException('Feedback is required for regeneration')
      );
    });

    it('should handle API errors during translation regeneration', async () => {
      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('Translation regeneration failed'));

      await expect(service.regenerateTranslation(regenerateTranslationOptions)).rejects.toThrow(
        new InternalServerErrorException('Translation service unavailable')
      );
    });

    it('should throw error when no translation is generated', async () => {
      const emptyResponse = {
        choices: [{ message: { content: null } }],
        usage: { total_tokens: 0 },
      };
      mockOpenAI.chat.completions.create.mockResolvedValue(emptyResponse);

      await expect(service.regenerateTranslation(regenerateTranslationOptions)).rejects.toThrow(
        new InternalServerErrorException('Translation service unavailable')
      );
    });
  });

  describe('content prompts', () => {
    it('should have prompts for all content types', () => {
      const contentPrompts = (service as any).contentPrompts;
      
      expect(contentPrompts[ContentType.SOCIAL_POST]).toBeDefined();
      expect(contentPrompts[ContentType.EMAIL_SUBJECT]).toBeDefined();
      expect(contentPrompts[ContentType.EMAIL_BODY]).toBeDefined();
      expect(contentPrompts[ContentType.PRODUCT_DESCRIPTION]).toBeDefined();
      expect(contentPrompts[ContentType.BLOG_POST]).toBeDefined();
      expect(contentPrompts[ContentType.AD_COPY]).toBeDefined();
      expect(contentPrompts[ContentType.AD_HEADLINE]).toBeDefined();
    });

    it('should use correct prompts for each content type', () => {
      const contentPrompts = (service as any).contentPrompts;
      
      expect(contentPrompts[ContentType.SOCIAL_POST]).toContain('social media');
      expect(contentPrompts[ContentType.EMAIL_SUBJECT]).toContain('subject line');
      expect(contentPrompts[ContentType.PRODUCT_DESCRIPTION]).toContain('product description');
      expect(contentPrompts[ContentType.BLOG_POST]).toContain('blog post');
      expect(contentPrompts[ContentType.AD_COPY]).toContain('advertising copy');
      expect(contentPrompts[ContentType.AD_HEADLINE]).toContain('headline');
    });
  });
});
