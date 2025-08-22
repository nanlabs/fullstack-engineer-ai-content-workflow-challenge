import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

const httpUrl = process.env.NEXT_PUBLIC_API_HTTP_URL;
const wsUrl = process.env.NEXT_PUBLIC_API_WS_URL;

const httpLink = new HttpLink({
  uri: httpUrl
});

const wsLink = new GraphQLWsLink(createClient({
  url: wsUrl || ''
}));

const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === 'OperationDefinition' &&
      definition.operation === 'subscription'
    );
  },
  wsLink,
  httpLink,
);

export const apollo = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});
