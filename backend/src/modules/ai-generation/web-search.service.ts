import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

export interface SearchResult {
  title: string;
  snippet: string;
  url: string;
  source?: string;
}

export interface WebSearchResponse {
  results: SearchResult[];
  totalResults: number;
  searchTime: string;
}

@Injectable()
export class WebSearchService {
  private readonly logger = new Logger(WebSearchService.name);

  async search(query: string, maxResults: number = 2): Promise<WebSearchResponse | null> {
    try {
      this.logger.log(`Performing web search for: ${query}`);

      // Check if we have API credentials configured
      const hasGoogleApi = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;
      const hasSerperApi = process.env.SERPER_API_KEY;

      if (!hasGoogleApi && !hasSerperApi) {
        this.logger.warn('No web search API credentials configured, skipping web search');
        return null;
      }

      // Try Google Custom Search first, then Serper API as fallback
      if (hasGoogleApi) {
        try {
          return await this.googleCustomSearch(query, maxResults);
        } catch (error) {
          this.logger.warn('Google Custom Search failed, trying Serper API:', error.message);
          if (hasSerperApi) {
            return await this.serpApiSearch(query, maxResults);
          }
        }
      } else if (hasSerperApi) {
        return await this.serpApiSearch(query, maxResults);
      }

      // If all search methods fail, return null instead of mock data
      this.logger.warn('All web search methods failed, returning null');
      return null;

    } catch (error) {
      this.logger.error('Error performing web search:', error);
      // Return null instead of throwing error or using mock data
      return null;
    }
  }


  // Future implementation for real web search APIs
  private async googleCustomSearch(query: string, maxResults: number): Promise<WebSearchResponse> {
    // Implementation for Google Custom Search API
    // Requires GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID
    const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
    const searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

    if (!apiKey || !searchEngineId) {
      throw new Error('Google Custom Search API credentials not configured');
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: searchEngineId,
          q: query,
          num: maxResults
        }
      });

      const results: SearchResult[] = response.data.items?.map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
        source: 'Google Search'
      })) || [];

      return {
        results,
        totalResults: parseInt(response.data.searchInformation?.totalResults || '0'),
        searchTime: response.data.searchInformation?.searchTime || '0s'
      };

    } catch (error) {
      this.logger.error('Google Custom Search API error:', error);
      throw error;
    }
  }

  private async serpApiSearch(query: string, maxResults: number): Promise<WebSearchResponse> {
    // Implementation for Serper API (google.serper.dev)
    // Requires SERPER_API_KEY
    const apiKey = process.env.SERPER_API_KEY;

    if (!apiKey) {
      throw new Error('Serper API key not configured');
    }

    try {
      const response = await axios.post('https://google.serper.dev/search', {
        q: query,
        num: maxResults,
      }, {
        headers: {
          'X-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      });

      const results: SearchResult[] = response.data.organic?.map((item: any) => ({
        title: item.title,
        snippet: item.snippet,
        url: item.link,
        source: 'Serper',
      })) || [];

      return {
        results,
        totalResults: results.length, // Serper doesn't provide total results count
        searchTime: '0s' // Serper doesn't provide search time
      };

    } catch (error) {
      this.logger.error('Serper API error:', error);
      throw error;
    }
  }
}
