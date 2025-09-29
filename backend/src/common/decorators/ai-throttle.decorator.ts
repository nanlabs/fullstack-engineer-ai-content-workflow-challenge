import { applyDecorators } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';

// Simple rate limiting for AI endpoints
export function AiThrottle() {
  return applyDecorators(
    Throttle({
      default: {
        ttl: 60000, // 1 minute
        limit: 10, // max 10 AI requests per minute
      }
    })
  );
}
