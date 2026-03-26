import { Test, TestingModule } from '@nestjs/testing';
import { ContentWorkflow } from './content-workflow';
import { AiService } from './ai.service';

const mockAiService = {
  generateDraft: jest.fn(),
  translate: jest.fn(),
  extractMetadata: jest.fn(),
};

describe('ContentWorkflow', () => {
  let workflow: ContentWorkflow;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentWorkflow,
        { provide: AiService, useValue: mockAiService },
      ],
    }).compile();

    workflow = module.get(ContentWorkflow);
    jest.clearAllMocks();
  });

  const baseInput = {
    campaignName: 'Summer Sale',
    campaignDescription: 'Big discounts',
    title: 'Beach Essentials',
    language: 'en',
    targetLanguages: ['en', 'es', 'fr'],
  };

  it('runs the full pipeline: generate → translate → extract', async () => {
    mockAiService.generateDraft.mockResolvedValue('Generated body');
    mockAiService.translate.mockImplementation(async (input) => ({
      title: `Translated title (${input.targetLanguage})`,
      body: `Translated body (${input.targetLanguage})`,
    }));
    mockAiService.extractMetadata.mockResolvedValue({
      keywords: ['beach'],
      tone: 'casual',
      sentiment: 'positive',
      readability: 'simple',
    });

    const result = await workflow.runFullPipeline(baseInput);

    expect(result.generatedBody).toBe('Generated body');
    expect(result.translations).toHaveProperty('es');
    expect(result.translations).toHaveProperty('fr');
    expect(result.metadata).toBeDefined();
    expect(result.metadata).toHaveProperty('keywords');
    expect(result.currentStep).toBe('done');
    expect(result.error).toBeNull();
  });

  it('skips translation for the current language', async () => {
    mockAiService.generateDraft.mockResolvedValue('Generated body');
    mockAiService.translate.mockResolvedValue({ title: 'T', body: 'B' });
    mockAiService.extractMetadata.mockResolvedValue({
      keywords: [],
      tone: 'casual',
      sentiment: 'neutral',
      readability: 'simple',
    });

    const result = await workflow.runFullPipeline(baseInput);

    // Should translate to 'es' and 'fr' but NOT 'en' (current language)
    expect(mockAiService.translate).toHaveBeenCalledTimes(2);
    expect(result.translations).not.toHaveProperty('en');
    expect(result.translations).toHaveProperty('es');
    expect(result.translations).toHaveProperty('fr');
  });

  it('translates all target languages except current', async () => {
    mockAiService.generateDraft.mockResolvedValue('Body');
    mockAiService.translate.mockResolvedValue({ title: 'T', body: 'B' });
    mockAiService.extractMetadata.mockResolvedValue({
      keywords: [],
      tone: 'professional',
      sentiment: 'positive',
      readability: 'moderate',
    });

    const input = { ...baseInput, targetLanguages: ['en', 'de', 'ja', 'pt'] };
    const result = await workflow.runFullPipeline(input);

    expect(mockAiService.translate).toHaveBeenCalledTimes(3);
    expect(Object.keys(result.translations)).toEqual(
      expect.arrayContaining(['de', 'ja', 'pt']),
    );
  });

  it('passes the correct inputs to generateDraft', async () => {
    mockAiService.generateDraft.mockResolvedValue('Body');
    mockAiService.translate.mockResolvedValue({ title: 'T', body: 'B' });
    mockAiService.extractMetadata.mockResolvedValue({
      keywords: [],
      tone: 'casual',
      sentiment: 'neutral',
      readability: 'simple',
    });

    await workflow.runFullPipeline({
      ...baseInput,
      userPrompt: 'Custom prompt',
      wordCount: 300,
      provider: 'gpt-5.4-mini',
    });

    expect(mockAiService.generateDraft).toHaveBeenCalledWith(
      expect.objectContaining({
        campaignName: 'Summer Sale',
        title: 'Beach Essentials',
        language: 'en',
        userPrompt: 'Custom prompt',
        wordCount: 300,
        provider: 'gpt-5.4-mini',
      }),
    );
  });

  it('passes generated body to translate', async () => {
    mockAiService.generateDraft.mockResolvedValue('The generated content');
    mockAiService.translate.mockResolvedValue({ title: 'T', body: 'B' });
    mockAiService.extractMetadata.mockResolvedValue({
      keywords: [],
      tone: 'casual',
      sentiment: 'neutral',
      readability: 'simple',
    });

    await workflow.runFullPipeline({ ...baseInput, targetLanguages: ['en', 'es'] });

    expect(mockAiService.translate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: 'The generated content',
        sourceLanguage: 'en',
        targetLanguage: 'es',
      }),
    );
  });

  it('extracts metadata from the generated body', async () => {
    mockAiService.generateDraft.mockResolvedValue('Generated body text');
    mockAiService.translate.mockResolvedValue({ title: 'T', body: 'B' });
    mockAiService.extractMetadata.mockResolvedValue({
      keywords: ['summer'],
      tone: 'casual',
      sentiment: 'positive',
      readability: 'simple',
    });

    await workflow.runFullPipeline(baseInput);

    expect(mockAiService.extractMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Beach Essentials',
        body: 'Generated body text',
        language: 'en',
      }),
    );
  });

  it('handles no target languages needing translation', async () => {
    mockAiService.generateDraft.mockResolvedValue('Body');
    mockAiService.extractMetadata.mockResolvedValue({
      keywords: [],
      tone: 'casual',
      sentiment: 'neutral',
      readability: 'simple',
    });

    const result = await workflow.runFullPipeline({
      ...baseInput,
      targetLanguages: ['en'], // only current language
    });

    expect(mockAiService.translate).not.toHaveBeenCalled();
    expect(result.translations).toEqual({});
  });
});
