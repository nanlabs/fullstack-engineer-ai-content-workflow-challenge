import { Module } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
import { RealtimeGateway } from './realtime.gateway';

@Module({
  imports: [EventsModule],
  providers: [RealtimeGateway],
  exports: [RealtimeGateway],
})
export class RealtimeModule {}
