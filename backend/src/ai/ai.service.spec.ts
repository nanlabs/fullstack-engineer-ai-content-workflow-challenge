import { Test, TestingModule } from '@nestjs/testing';
import { AiService, GenerateInput, TranslateInput, ExtractInput } from './ai.service';
import { ModelFactory } from './model-factory.service';

// Mock a LangChain model that works with .pipe()
function createMockModel(response: string) {
  const parser = { invoke: jest.fn().mockResolvedValue(response) };
  const piped = { pipe: jest.fn().mockReturnValue(parser), invoke: parser.invoke };
  const model = { pipe: jest.fn().mockReturnValue(piped) };
  // The chain is: prompt.pipe(model).pipe(parser)
  // prompt.pipe(model) → piped, piped.pipe(parser) → { invoke }
  return { model, invoke: parser.invoke };
}

// We mock the prompts so chain construction is predictable
jest.mock('./prompts', () => ({
  generateDraftPrompt: { pipe: jest.fn() },
  translatePrompt: { pipe: jest.fn() },
  extractMetadataPrompt: { pipe: jest.fn() },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const prompts = require('./prompts');

const mockModelFactory = {
  getModel: jest.fn(),
  getAvailableProviders: jest.fn(),
  getDefaultProvider: jest.fn(),
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: ModelFactory, useValue: mockModelFactory },
      ],
    }).compile();

    service = module.get(AiService);
    jest.clearAllMocks();
  });

  describe('generateDraft', () => {
    const input: GenerateInput = {
      campaignName: 'Summer Sale',
      campaignDescription: 'Big summer discounts',
      title: 'Beach Essentials',
      language: 'en',
    };

    it('returns trimmed generated content', async () => {
      const mockInvoke = jest.fn().mockResolvedValue('  Generated body text  ');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      const mockModel = {};
      mockModelFactory.getModel.mockReturnValue(mockModel);
      prompts.generateDraftPrompt.pipe.mockReturnValue(mockPiped);

      const result = await service.generateDraft(input);

      expect(result).toBe('Generated body text');
      expect(mockModelFactory.getModel).toHaveBeenCalledWith(undefined);
    });

    it('uses specified provider when given', async () => {
      const mockInvoke = jest.fn().mockResolvedValue('content');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.generateDraftPrompt.pipe.mockReturnValue(mockPiped);

      await service.generateDraft({ ...input, provider: 'claude-sonnet-4.6' });

      expect(mockModelFactory.getModel).toHaveBeenCalledWith('claude-sonnet-4.6');
    });

    it('passes wordCount as length guidance', async () => {
      const mockInvoke = jest.fn().mockResolvedValue('content');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.generateDraftPrompt.pipe.mockReturnValue(mockPiped);

      await service.generateDraft({ ...input, wordCount: 200 });

      expect(mockInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          lengthGuidance: 'Aim for approximately 200 words.',
        }),
      );
    });

    it('uses default length guidance when wordCount is not provided', async () => {
      const mockInvoke = jest.fn().mockResolvedValue('content');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.generateDraftPrompt.pipe.mockReturnValue(mockPiped);

      await service.generateDraft(input);

      expect(mockInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          lengthGuidance: 'Use your best judgment for an appropriate length.',
        }),
      );
    });

    it('provides default userPrompt when none given', async () => {
      const mockInvoke = jest.fn().mockResolvedValue('content');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.generateDraftPrompt.pipe.mockReturnValue(mockPiped);

      await service.generateDraft(input);

      expect(mockInvoke).toHaveBeenCalledWith(
        expect.objectContaining({
          userPrompt: 'Generate professional marketing content based on the title and campaign context',
        }),
      );
    });

    it('propagates errors from the AI model', async () => {
      const mockInvoke = jest.fn().mockRejectedValue(new Error('Rate limit 429'));
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.generateDraftPrompt.pipe.mockReturnValue(mockPiped);

      await expect(service.generateDraft(input)).rejects.toThrow('Rate limit 429');
    });
  });

  describe('translate', () => {
    const input: TranslateInput = {
      title: 'Hello World',
      body: 'This is the body content.',
      sourceLanguage: 'en',
      targetLanguage: 'es',
    };

    it('parses TITLE: / BODY: format correctly', async () => {
      const raw = 'TITLE: Hola Mundo\nBODY: Este es el contenido del cuerpo.';
      const mockInvoke = jest.fn().mockResolvedValue(raw);
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.translatePrompt.pipe.mockReturnValue(mockPiped);

      const result = await service.translate(input);

      expect(result.title).toBe('Hola Mundo');
      expect(result.body).toBe('Este es el contenido del cuerpo.');
    });

    it('falls back to line-splitting when TITLE/BODY markers are missing', async () => {
      const raw = 'Hola Mundo\nEste es el contenido.';
      const mockInvoke = jest.fn().mockResolvedValue(raw);
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.translatePrompt.pipe.mockReturnValue(mockPiped);

      const result = await service.translate(input);

      expect(result.title).toBe('Hola Mundo');
      expect(result.body).toBe('Hola Mundo\nEste es el contenido.');
    });

    it('uses specified provider', async () => {
      const mockInvoke = jest.fn().mockResolvedValue('TITLE: T\nBODY: B');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.translatePrompt.pipe.mockReturnValue(mockPiped);

      await service.translate({ ...input, provider: 'gpt-5.4-mini' });

      expect(mockModelFactory.getModel).toHaveBeenCalledWith('gpt-5.4-mini');
    });
  });

  describe('extractMetadata', () => {
    const input: ExtractInput = {
      title: 'Summer Sale',
      body: 'Big discounts on all items.',
      language: 'en',
    };

    it('parses valid JSON response', async () => {
      const json = JSON.stringify({
        keywords: ['summer', 'sale'],
        tone: 'casual',
        sentiment: 'positive',
        readability: 'simple',
      });
      const mockInvoke = jest.fn().mockResolvedValue(json);
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.extractMetadataPrompt.pipe.mockReturnValue(mockPiped);

      const result = await service.extractMetadata(input);

      expect(result.keywords).toEqual(['summer', 'sale']);
      expect(result.tone).toBe('casual');
      expect(result.sentiment).toBe('positive');
      expect(result.readability).toBe('simple');
    });

    it('strips markdown code fences before parsing', async () => {
      const json = '```json\n{"keywords":["a"],"tone":"casual","sentiment":"neutral","readability":"moderate"}\n```';
      const mockInvoke = jest.fn().mockResolvedValue(json);
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.extractMetadataPrompt.pipe.mockReturnValue(mockPiped);

      const result = await service.extractMetadata(input);

      expect(result.keywords).toEqual(['a']);
      expect(result.tone).toBe('casual');
    });

    it('throws on invalid JSON response', async () => {
      const mockInvoke = jest.fn().mockResolvedValue('not valid json');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.extractMetadataPrompt.pipe.mockReturnValue(mockPiped);

      await expect(service.extractMetadata(input)).rejects.toThrow();
    });
  });

  describe('compare', () => {
    const input: GenerateInput = {
      campaignName: 'Sale',
      campaignDescription: 'Desc',
      title: 'Title',
      language: 'en',
    };

    beforeEach(() => {
      // Setup generateDraft to work for the compare method
      const mockInvoke = jest.fn()
        .mockResolvedValueOnce('  openai result  ')
        .mockResolvedValueOnce('  anthropic result  ');
      const mockChain = { invoke: mockInvoke };
      const mockPiped = { pipe: jest.fn().mockReturnValue(mockChain) };
      mockModelFactory.getModel.mockReturnValue({});
      prompts.generateDraftPrompt.pipe.mockReturnValue(mockPiped);
    });

    it('calls generateDraft for each selected provider', async () => {
      const result = await service.compare(input, ['gpt-5.4-mini', 'claude-sonnet-4.6']);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result['gpt-5.4-mini']).toBeDefined();
      expect(result['claude-sonnet-4.6']).toBeDefined();
    });

    it('uses available providers when none specified', async () => {
      mockModelFactory.getAvailableProviders.mockReturnValue(['gpt-5.4-mini', 'claude-sonnet-4.6']);

      const result = await service.compare(input);

      expect(mockModelFactory.getAvailableProviders).toHaveBeenCalled();
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('uses available providers when empty array is passed', async () => {
      mockModelFactory.getAvailableProviders.mockReturnValue(['gpt-5.4-mini']);

      const result = await service.compare(input, []);

      expect(mockModelFactory.getAvailableProviders).toHaveBeenCalled();
      expect(Object.keys(result)).toHaveLength(1);
    });
  });
});
