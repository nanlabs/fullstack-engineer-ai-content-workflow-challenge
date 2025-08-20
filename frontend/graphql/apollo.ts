import { ApolloClient, InMemoryCache, split, HttpLink } from '@apollo/client';
import { GraphQLWsLink } from '@apollo/client/link/subscriptions';
import { createClient } from 'graphql-ws';
import { getMainDefinition } from '@apollo/client/utilities';

// TODO: read it from .env
const API_HOST = 'localhost';
const API_PORT = 3001

const httpLink = new HttpLink({
  uri: `http://${API_HOST}:${API_PORT}/graphql`
});

const wsLink = new GraphQLWsLink(createClient({
  url: `ws://${API_HOST}:${API_PORT}/graphql`,
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
