import { Module } from '@nestjs/common';
import { ContentEventsGateway } from './content-events.gateway';

@Module({
  providers: [ContentEventsGateway],
  exports: [ContentEventsGateway],
})
export class WebsocketModule {}
