import { ArgumentMetadata } from '@nestjs/common';
import { SanitizePipe } from './sanitize.pipe';

describe('SanitizePipe', () => {
  let pipe: SanitizePipe;
  const bodyMetadata: ArgumentMetadata = { type: 'body', metatype: Object, data: '' };
  const queryMetadata: ArgumentMetadata = { type: 'query', metatype: Object, data: '' };

  beforeEach(() => {
    pipe = new SanitizePipe();
  });

  it('strips HTML tags from strings', () => {
    const result = pipe.transform('<b>bold</b> text', bodyMetadata);
    expect(result).toBe('bold text');
  });

  it('removes script tags and their content', () => {
    const result = pipe.transform('<script>alert("xss")</script>safe', bodyMetadata);
    expect(result).toBe('safe');
  });

  it('removes event handler attributes', () => {
    const result = pipe.transform('<div onclick="alert(1)">content</div>', bodyMetadata);
    expect(result).toBe('content');
  });

  it('sanitizes all string fields in an object', () => {
    const input = {
      name: '<b>Test</b>',
      description: '<script>xss</script>Desc',
      count: 5,
    };
    const result = pipe.transform(input, bodyMetadata) as Record<string, unknown>;

    expect(result.name).toBe('Test');
    expect(result.description).toBe('Desc');
    expect(result.count).toBe(5);
  });

  it('sanitizes strings inside arrays', () => {
    const input = {
      tags: ['<b>one</b>', '<i>two</i>', 'three'],
    };
    const result = pipe.transform(input, bodyMetadata) as Record<string, unknown>;

    expect(result.tags).toEqual(['one', 'two', 'three']);
  });

  it('passes non-string array items through unchanged', () => {
    const input = { values: [1, true, null, '<b>text</b>'] };
    const result = pipe.transform(input, bodyMetadata) as Record<string, unknown>;

    expect(result.values).toEqual([1, true, null, 'text']);
  });

  it('skips non-body metadata types', () => {
    const input = '<script>alert("xss")</script>safe';
    const result = pipe.transform(input, queryMetadata);

    expect(result).toBe(input); // not sanitized
  });

  it('passes through numbers unchanged', () => {
    expect(pipe.transform(42, bodyMetadata)).toBe(42);
  });

  it('passes through null unchanged', () => {
    expect(pipe.transform(null, bodyMetadata)).toBeNull();
  });

  it('passes through undefined unchanged', () => {
    expect(pipe.transform(undefined, bodyMetadata)).toBeUndefined();
  });

  it('handles nested HTML correctly', () => {
    const result = pipe.transform('<div><p><a href="http://evil.com">click</a></p></div>', bodyMetadata);
    expect(result).toBe('click');
  });

  it('blocks img tag XSS', () => {
    const result = pipe.transform('<img src=x onerror=alert(1)>text', bodyMetadata);
    expect(result).toBe('text');
  });
});
