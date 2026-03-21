import { Controller, Sse } from '@nestjs/common';
import { Observable, Subject } from 'rxjs';
import { map } from 'rxjs/operators';
import { OnEvent } from '@nestjs/event-emitter';

interface SseEvent {
  type: string;
  data: unknown;
}

@Controller('events')
export class EventsController {
  private readonly events$ = new Subject<SseEvent>();

  @Sse()
  sse(): Observable<MessageEvent> {
    return this.events$.pipe(
      map(
        (event) =>
          ({
            data: JSON.stringify(event),
          }) as MessageEvent,
      ),
    );
  }

  @OnEvent('content.*')
  handleContentEvent(payload: unknown) {
    // The event name pattern provides the type
    this.events$.next({ type: 'content.update', data: payload });
  }

  @OnEvent('content.statusChanged')
  handleStatusChange(payload: unknown) {
    this.events$.next({ type: 'content.statusChanged', data: payload });
  }

  @OnEvent('content.aiGenerated')
  handleAiGenerated(payload: unknown) {
    this.events$.next({ type: 'content.aiGenerated', data: payload });
  }

  @OnEvent('content.chainCompleted')
  handleChainCompleted(payload: unknown) {
    this.events$.next({ type: 'content.chainCompleted', data: payload });
  }
}
