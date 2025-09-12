import { ApolloClient, InMemoryCache, HttpLink, ApolloLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// HTTP link for queries and mutations
const httpLink = new HttpLink({
  uri: 'http://localhost:3000/graphql', // Replace with your GraphQL endpoint
});

// WebSocket link for subscriptions
const wsLink = new GraphQLWsLink(
  createClient({
    url: 'ws://localhost:3000/graphql', // Replace with your GraphQL WebSocket endpoint
  }),
);

// Split links based on operation type
const splitLink = ApolloLink.split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return definition.kind === 'OperationDefinition' && definition.operation === 'subscription';
  },
  wsLink,
  httpLink,
);

// Apollo Client instance
export const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
