import { Injectable, Logger } from '@nestjs/common';
import { StateGraph, Annotation, END, START } from '@langchain/langgraph';
import { AiService } from './ai.service';

const ContentWorkflowState = Annotation.Root({
  campaignName: Annotation<string>,
  campaignDescription: Annotation<string>,
  title: Annotation<string>,
  userPrompt: Annotation<string>,
  language: Annotation<string>,
  targetLanguages: Annotation<string[]>,
  provider: Annotation<string | undefined>,
  wordCount: Annotation<number | undefined>,
  // Outputs
  generatedBody: Annotation<string>,
  translations: Annotation<Record<string, { title: string; body: string }>>,
  metadata: Annotation<Record<string, unknown> | null>,
  currentStep: Annotation<string>,
  error: Annotation<string | null>,
});

type WorkflowState = typeof ContentWorkflowState.State;

@Injectable()
export class ContentWorkflow {
  private readonly logger = new Logger(ContentWorkflow.name);

  constructor(private readonly aiService: AiService) {}

  async runFullPipeline(input: {
    campaignName: string;
    campaignDescription: string;
    title: string;
    language: string;
    targetLanguages: string[];
    userPrompt?: string;
    wordCount?: number;
    provider?: string;
  }): Promise<WorkflowState> {
    const graph = this.buildGraph();
    const app = graph.compile();

    const result = await app.invoke({
      ...input,
      userPrompt: input.userPrompt || 'Generate professional marketing content based on the title and campaign context',
      generatedBody: '',
      translations: {},
      metadata: null,
      currentStep: 'generate',
      error: null,
    });

    return result;
  }

  private buildGraph() {
    const graph = new StateGraph(ContentWorkflowState)
      .addNode('generate', async (state: WorkflowState) => {
        this.logger.log('Workflow: generating draft...');
        const body = await this.aiService.generateDraft({
          campaignName: state.campaignName,
          campaignDescription: state.campaignDescription,
          title: state.title,
          userPrompt: state.userPrompt,
          wordCount: state.wordCount,
          language: state.language,
          provider: state.provider,
        });
        return { generatedBody: body, currentStep: 'translate' };
      })
      .addNode('translate', async (state: WorkflowState) => {
        this.logger.log('Workflow: translating to target languages...');
        const translations: Record<string, { title: string; body: string }> = {};
        for (const lang of state.targetLanguages) {
          if (lang === state.language) continue;
          const result = await this.aiService.translate({
            title: state.title,
            body: state.generatedBody,
            sourceLanguage: state.language,
            targetLanguage: lang,
            provider: state.provider,
          });
          translations[lang] = result;
        }
        return { translations, currentStep: 'extract' };
      })
      .addNode('extract', async (state: WorkflowState) => {
        this.logger.log('Workflow: extracting metadata...');
        const metadata = await this.aiService.extractMetadata({
          title: state.title,
          body: state.generatedBody,
          language: state.language,
          provider: state.provider,
        });
        return { metadata, currentStep: 'done' };
      })
      .addEdge(START, 'generate')
      .addEdge('generate', 'translate')
      .addEdge('translate', 'extract')
      .addEdge('extract', END);

    return graph;
  }
}
