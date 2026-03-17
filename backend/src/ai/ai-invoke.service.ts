import { Injectable } from '@nestjs/common';
import { ModelCandidate } from './ai.types';

@Injectable()
export class AiInvokeService {
  private readonly maxAttempts = 3;
  private readonly timeoutMs = 20_000;

  async invokeJsonWithRetry<T>(candidate: ModelCandidate, prompt: string): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxAttempts; attempt += 1) {
      try {
        const client = candidate.client as { invoke: (input: string) => Promise<{ content: unknown }> };
        const response = await this.withTimeout(
          client.invoke(prompt),
          this.timeoutMs,
          `${candidate.provider}:${candidate.model}`,
        );
        return this.parseModelJson<T>(response.content);
      } catch (error) {
        lastError = error;
        if (attempt < this.maxAttempts) {
          await this.sleep(400 * attempt);
        }
      }
    }

    throw lastError;
  }

  private parseModelJson<T>(content: unknown): T {
    if (typeof content === 'string') {
      return this.parseJsonString<T>(content);
    }

    if (Array.isArray(content)) {
      const merged = content
        .map((chunk) => {
          if (typeof chunk === 'string') {
            return chunk;
          }
          if (chunk && typeof chunk === 'object' && 'text' in chunk) {
            return String((chunk as { text: unknown }).text);
          }
          return '';
        })
        .join('');
      return this.parseJsonString<T>(merged);
    }

    throw new Error('Model response content is not valid JSON');
  }

  private parseJsonString<T>(raw: string): T {
    const trimmed = raw.trim();

    const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (fencedMatch?.[1]) {
      return JSON.parse(fencedMatch[1]) as T;
    }

    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const candidate = trimmed.slice(firstBrace, lastBrace + 1);
      return JSON.parse(candidate) as T;
    }

    return JSON.parse(trimmed) as T;
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    let timeoutHandle: NodeJS.Timeout | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout after ${ms}ms for ${label}`));
      }, ms);
    });

    try {
      return (await Promise.race([promise, timeoutPromise])) as T;
    } finally {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
    }
  }

  private async sleep(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
