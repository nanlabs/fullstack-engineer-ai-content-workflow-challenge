import { Global, Module } from '@nestjs/common';
import { PubSub } from 'graphql-subscriptions';
import { PUB_SUB } from './pubsub.token';

@Global() // <-- makes the providers available app-wide without importing the module everywhere
@Module({
  providers: [
    // NOTE: Single shared PubSub instance for the whole app
    { provide: PUB_SUB, useFactory: () => new PubSub() },
  ],
  exports: [PUB_SUB],
})
export class RealtimeModule {}
