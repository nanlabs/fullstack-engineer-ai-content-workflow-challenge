import { PubSub } from 'graphql-subscriptions';
import { Global, Module } from '@nestjs/common';
import { PUB_SUB } from './pubsub.token';
import { RealtimeResolver } from './realtime.resolver';

@Global() // <-- makes the providers available app-wide without importing the module everywhere
@Module({
  providers: [
    // NOTE: Single shared PubSub instance for the whole app
    { provide: PUB_SUB, useFactory: () => new PubSub() },
    RealtimeResolver,
  ],
  exports: [PUB_SUB],
})
export class RealtimeModule {}
