import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WebsocketsGateway } from '../websockets/websockets.gateway';
import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { WebSearchService } from './web-search.service';

export interface GenerationRequest {
  contentPieceId: string;
  prompt: string;
  contentType?: string;
  language?: string;
  campaignContext?: {
    name: string;
    description?: string;
  };
}

export interface AgentContext {
  originalRequest: GenerationRequest;
  researchFindings?: string;
  contentPiece: any;
}

@Injectable()
export class AgentOrchestrationService {
  private readonly logger = new Logger(AgentOrchestrationService.name);
  private openai: ChatOpenAI;

  constructor(
    private prisma: PrismaService,
    private websocketsGateway: WebsocketsGateway,
    private webSearchService: WebSearchService,
  ) {
    this.openai = new ChatOpenAI({
      openAIApiKey: process.env.OPENAI_API_KEY,
      modelName: 'gpt-3.5-turbo',
      temperature: 0.7,
    });
  }

  async orchestrateGeneration(request: GenerationRequest) {
    try {
      this.logger.log(`Starting agent orchestration for content piece: ${request.contentPieceId}`);

      // Get content piece details
      const contentPiece = await this.prisma.contentPiece.findUnique({
        where: { id: request.contentPieceId },
        include: { campaign: true },
      });

      if (!contentPiece) {
        throw new Error('Content piece not found');
      }

      // Create agent context
      const context: AgentContext = {
        originalRequest: request,
        contentPiece,
      };

      // Step 1: Orchestrator Agent - Analyze request and decide workflow
      const orchestratorDecision = await this.orchestratorAgent(context);
      
      // Step 2: Execute workflow based on orchestrator decision
      let finalContext = context;
      
      if (orchestratorDecision.needsResearch) {
        this.logger.log('Orchestrator decided research is needed');
        // Phase 2: Implement research agent
        finalContext = await this.researchAgent(context);
      }

      // Step 3: Draft Agent - Generate the content
      const draftResult = await this.draftAgent(finalContext);

      // Step 4: Create draft in database
      const draft = await this.prisma.draft.create({
        data: {
          content: draftResult.content,
          language: request.language || contentPiece.language,
          reviewState: 'SUGGESTED_BY_AI',
          aiModel: 'openai-gpt-3.5-turbo-orchestrated',
          contentPieceId: request.contentPieceId,
        },
      });

      // Notify WebSocket clients
      this.websocketsGateway.notifyAIGenerationCompleted(request.contentPieceId, draft);
      this.websocketsGateway.notifyDraftGenerated(request.contentPieceId, draft);

      this.logger.log(`Agent orchestration completed successfully for content piece: ${request.contentPieceId}`);
      return draft;

    } catch (error) {
      this.logger.error('Error in agent orchestration:', error);
      this.websocketsGateway.notifyAIGenerationFailed(request.contentPieceId, error.message);
      throw error;
    }
  }

  private async orchestratorAgent(context: AgentContext): Promise<{ needsResearch: boolean; reasoning: string }> {
    const orchestratorPrompt = PromptTemplate.fromTemplate(`
You are an AI Orchestrator Agent responsible for analyzing content generation requests and deciding the optimal workflow.

Your task is to analyze the following request and determine if external research is needed to provide the best possible content.

REQUEST ANALYSIS:
- Campaign: {campaignName}
- Content Type: {contentType}
- Language: {language}
- User Prompt: {userPrompt}
- Content Piece Description: {description}

RESEARCH TRIGGERS (research needed if any are present):
1. Mentions of existing companies, brands, or protocols (e.g., "Tesla", "Binance", "Apple")
2. Famous people or public figures
3. Current events or time-sensitive keywords (e.g., "latest", "news", "trends", "new release")
4. Fast-moving industries (crypto, AI, fintech, gaming)
5. If unsure, perform web search to give the user the best possible response

RESPONSE FORMAT:
Provide your analysis in the following JSON format:
{{
  "needsResearch": true/false,
  "reasoning": "Brief explanation of your decision"
}}

ANALYSIS:
`);

    const chain = orchestratorPrompt.pipe(this.openai);

    try {
      const response = await chain.invoke({
        campaignName: context.contentPiece.campaign.name,
        contentType: context.originalRequest.contentType || context.contentPiece.contentType,
        language: context.originalRequest.language || context.contentPiece.language,
        userPrompt: context.originalRequest.prompt,
        description: context.contentPiece.description || 'No description provided',
      });

      // Parse the JSON response
      const responseContent = typeof response === 'string' ? response : 
        Array.isArray(response.content) ? (response.content[0] as any).text : response.content;
      const decision = JSON.parse(responseContent);
      this.logger.log(`Orchestrator decision: ${decision.reasoning}`);
      
      return decision;
    } catch (error) {
      this.logger.error('Error in orchestrator agent:', error);
      // Fallback: assume no research needed
      return { needsResearch: false, reasoning: 'Error in analysis, proceeding without research' };
    }
  }

  private async draftAgent(context: AgentContext): Promise<{ content: string }> {
    const draftPrompt = PromptTemplate.fromTemplate(`
You are a professional content writer for ACME GLOBAL MEDIA Marketing Agency.
ACME GLOBAL MEDIA produces ads, micro-sites, and marketing materials in multiple languages.

Generate high-quality content based on the following requirements:

CAMPAIGN CONTEXT:
- Campaign: {campaignName}
- Content Type: {contentType}
- Language: {language}
- Description: {description}

USER REQUEST:
{userPrompt}

RESEARCH CONTEXT:
{researchContext}

INSTRUCTIONS:
- Generate professional, engaging content that matches the campaign's tone and objectives
- Ensure the content is appropriate for the specified language and content type
- If research context is provided, incorporate relevant information naturally
- Keep the content concise and impactful
- Focus on the user's specific request while maintaining brand consistency

CONTENT:
`);

    const chain = draftPrompt.pipe(this.openai);

    try {
      const response = await chain.invoke({
        campaignName: context.contentPiece.campaign.name,
        contentType: context.originalRequest.contentType || context.contentPiece.contentType,
        language: context.originalRequest.language || context.contentPiece.language,
        description: context.contentPiece.description || 'No description provided',
        userPrompt: context.originalRequest.prompt,
        researchContext: context.researchFindings || 'No additional research context available',
      });

      const content = typeof response === 'string' ? response : 
        Array.isArray(response.content) ? (response.content[0] as any).text : response.content;
      this.logger.log('Draft agent completed successfully');
      return { content };
    } catch (error) {
      this.logger.error('Error in draft agent:', error);
      throw error;
    }
  }

  private async researchAgent(context: AgentContext): Promise<AgentContext> {
    const researchPrompt = PromptTemplate.fromTemplate(`
You are a Research Agent responsible for gathering relevant external information to enhance content generation.

Your task is to analyze the user's request and determine the most effective search queries to gather relevant information.

USER REQUEST:
- Campaign: {campaignName}
- Content Type: {contentType}
- Language: {language}
- User Prompt: {userPrompt}
- Description: {description}

INSTRUCTIONS:
1. Analyze the request to identify key entities, topics, or concepts that would benefit from external research
2. Generate 1-3 specific search queries that would provide valuable context
3. Focus on recent information, industry trends, or specific details that would enhance the content

RESPONSE FORMAT:
Provide your analysis in the following JSON format:
{{
  "searchQueries": ["query1", "query2", "query3"],
  "reasoning": "Brief explanation of why these searches are needed"
}}

ANALYSIS:
`);

    const chain = researchPrompt.pipe(this.openai);

    try {
      const response = await chain.invoke({
        campaignName: context.contentPiece.campaign.name,
        contentType: context.originalRequest.contentType || context.contentPiece.contentType,
        language: context.originalRequest.language || context.contentPiece.language,
        userPrompt: context.originalRequest.prompt,
        description: context.contentPiece.description || 'No description provided',
      });

      // Parse the JSON response
      const responseContent = typeof response === 'string' ? response : 
        Array.isArray(response.content) ? (response.content[0] as any).text : response.content;
      const researchDecision = JSON.parse(responseContent);
      this.logger.log(`Research Agent decision: ${researchDecision.reasoning}`);

      // Execute web searches
      let researchFindings = '';
      for (const query of researchDecision.searchQueries) {
        try {
          this.logger.log(`Executing web search for: ${query}`);
          const searchResults = await this.webSearchService.search(query, 3);
          
          // Only process results if search was successful
          if (searchResults && searchResults.results.length > 0) {
            // Format search results for context
            const formattedResults = searchResults.results.map(result => 
              `Title: ${result.title}\nSnippet: ${result.snippet}\nSource: ${result.source || 'Web'}\nURL: ${result.url}\n`
            ).join('\n---\n');

            researchFindings += `\n\nSearch Query: "${query}"\nResults:\n${formattedResults}`;
          } else {
            this.logger.log(`No search results available for: ${query}`);
          }
        } catch (error) {
          this.logger.error(`Error searching for "${query}":`, error);
          // Continue with other searches even if one fails
        }
      }

      // Update context with research findings
      const updatedContext: AgentContext = {
        ...context,
        researchFindings: researchFindings.trim()
      };

      this.logger.log('Research Agent completed successfully');
      return updatedContext;

    } catch (error) {
      this.logger.error('Error in research agent:', error);
      // Return original context if research fails
      return context;
    }
  }
}
