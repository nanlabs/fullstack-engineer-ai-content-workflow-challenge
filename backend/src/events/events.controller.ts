import { Controller, Sse, Query, UnauthorizedException, Logger, Res } from '@nestjs/common';
import { Observable, Subject, interval, merge } from 'rxjs';
import { map, finalize } from 'rxjs/operators';
import { OnEvent } from '@nestjs/event-emitter';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';

interface SseEvent {
  type: string;
  data: unknown;
}

@Controller('events')
export class EventsController {
  private readonly logger = new Logger(EventsController.name);
  private readonly userConnections = new Map<string, Set<Subject<SseEvent>>>();

  constructor(private readonly jwtService: JwtService) {}

  @Sse()
  sse(
    @Query('token') token: string,
    @Res() res: Response,
  ): Observable<MessageEvent> {
    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    let payload: { sub: string };
    try {
      payload = this.jwtService.verify(token);
    } catch {
      throw new UnauthorizedException('Invalid token');
    }

    // Disable response buffering for SSE
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('X-Accel-Buffering', 'no');
    res.setHeader('Connection', 'keep-alive');

    const userId = payload.sub;
    const subject = new Subject<SseEvent>();

    if (!this.userConnections.has(userId)) {
      this.userConnections.set(userId, new Set());
    }
    this.userConnections.get(userId)!.add(subject);
    this.logger.log(`SSE connected: user=${userId} (${this.userConnections.get(userId)!.size} connections)`);

    // Heartbeat every 15s keeps the connection alive through proxies
    const heartbeat$ = interval(15_000).pipe(
      map(() => ({ data: ':heartbeat' }) as MessageEvent),
    );

    const events$ = subject.pipe(
      map(
        (event) =>
          ({ data: JSON.stringify(event) }) as MessageEvent,
      ),
    );

    return merge(heartbeat$, events$).pipe(
      finalize(() => {
        const connections = this.userConnections.get(userId);
        if (connections) {
          connections.delete(subject);
          if (connections.size === 0) {
            this.userConnections.delete(userId);
          }
        }
        this.logger.log(`SSE disconnected: user=${userId}`);
      }),
    );
  }

  private emitToUser(userId: string | undefined, event: SseEvent) {
    if (!userId) return;
    const connections = this.userConnections.get(userId);
    if (connections) {
      connections.forEach((subj) => subj.next(event));
    }
  }

  @OnEvent('content.**')
  handleContentEvent(payload: any) {
    const userId = payload?.userId;
    this.logger.log(`Content event for user=${userId}`);
    this.emitToUser(userId, { type: 'content.update', data: payload });
  }

  @OnEvent('campaign.**')
  handleCampaignEvent(payload: any) {
    const userId = payload?.userId;
    this.logger.log(`Campaign event for user=${userId}, connections=${this.userConnections.get(userId)?.size ?? 0}`);
    this.emitToUser(userId, { type: 'campaign.update', data: payload });
  }
}
