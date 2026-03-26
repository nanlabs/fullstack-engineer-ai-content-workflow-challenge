import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Subject } from 'rxjs';
import { EventsController } from './events.controller';

const mockJwtService = {
  verify: jest.fn(),
};

describe('EventsController', () => {
  let controller: EventsController;
  let mockRes: any;

  beforeEach(() => {
    controller = new EventsController(mockJwtService as unknown as JwtService);
    mockRes = {
      setHeader: jest.fn(),
    };
    jest.clearAllMocks();
  });

  describe('sse', () => {
    it('throws UnauthorizedException when token is missing', () => {
      expect(() => controller.sse('', mockRes)).toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when token is invalid', () => {
      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      expect(() => controller.sse('bad-token', mockRes)).toThrow(
        UnauthorizedException,
      );
    });

    it('returns an Observable for valid token', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const result = controller.sse('valid-token', mockRes);

      expect(result).toBeDefined();
      expect(result.subscribe).toBeDefined();
    });

    it('sets correct SSE headers', () => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      controller.sse('valid-token', mockRes);

      expect(mockRes.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
      expect(mockRes.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    });
  });

  describe('handleContentEvent', () => {
    it('broadcasts content events to connected user', (done) => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      // Connect user-1
      const observable = controller.sse('token', mockRes);
      const received: any[] = [];

      const sub = observable.subscribe({
        next: (event) => {
          // Skip heartbeat events
          if (event.data !== ':heartbeat') {
            received.push(event);
          }
        },
      });

      // Emit a content event
      const payload = { id: 'piece-1', userId: 'user-1', status: 'AI_SUGGESTED' };
      controller.handleContentEvent(payload);

      // Allow async processing
      setTimeout(() => {
        expect(received).toHaveLength(1);
        const parsed = JSON.parse(received[0].data);
        expect(parsed.type).toBe('content.update');
        expect(parsed.data).toEqual(payload);
        sub.unsubscribe();
        done();
      }, 50);
    });

    it('does not broadcast to different user', (done) => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const observable = controller.sse('token', mockRes);
      const received: any[] = [];

      const sub = observable.subscribe({
        next: (event) => {
          if (event.data !== ':heartbeat') {
            received.push(event);
          }
        },
      });

      // Emit event for different user
      controller.handleContentEvent({ userId: 'user-2', id: 'piece-1' });

      setTimeout(() => {
        expect(received).toHaveLength(0);
        sub.unsubscribe();
        done();
      }, 50);
    });
  });

  describe('handleCampaignEvent', () => {
    it('broadcasts campaign events to connected user', (done) => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const observable = controller.sse('token', mockRes);
      const received: any[] = [];

      const sub = observable.subscribe({
        next: (event) => {
          if (event.data !== ':heartbeat') {
            received.push(event);
          }
        },
      });

      const payload = { id: 'camp-1', userId: 'user-1', name: 'Campaign' };
      controller.handleCampaignEvent(payload);

      setTimeout(() => {
        expect(received).toHaveLength(1);
        const parsed = JSON.parse(received[0].data);
        expect(parsed.type).toBe('campaign.update');
        expect(parsed.data).toEqual(payload);
        sub.unsubscribe();
        done();
      }, 50);
    });
  });

  describe('event routing', () => {
    it('does nothing when payload has no userId', (done) => {
      mockJwtService.verify.mockReturnValue({ sub: 'user-1' });

      const observable = controller.sse('token', mockRes);
      const received: any[] = [];

      const sub = observable.subscribe({
        next: (event) => {
          if (event.data !== ':heartbeat') {
            received.push(event);
          }
        },
      });

      controller.handleContentEvent({ id: 'piece-1' }); // no userId

      setTimeout(() => {
        expect(received).toHaveLength(0);
        sub.unsubscribe();
        done();
      }, 50);
    });
  });
});
