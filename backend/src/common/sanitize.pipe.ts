import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
import sanitizeHtml from 'sanitize-html';

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown, metadata: ArgumentMetadata) {
    if (metadata.type !== 'body') return value;
    if (typeof value === 'string') return this.sanitize(value);
    if (typeof value === 'object' && value !== null) {
      return this.sanitizeObject(value as Record<string, unknown>);
    }
    return value;
  }

  private sanitizeObject(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      if (typeof val === 'string') {
        result[key] = this.sanitize(val);
      } else if (Array.isArray(val)) {
        result[key] = val.map((item) =>
          typeof item === 'string' ? this.sanitize(item) : item,
        );
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  private sanitize(value: string): string {
    return sanitizeHtml(value, {
      allowedTags: [],
      allowedAttributes: {},
    });
  }
}
