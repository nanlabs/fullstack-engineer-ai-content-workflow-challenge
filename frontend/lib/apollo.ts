import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client';

// TODO: read it from .env
const API_URL = 'http://localhost:3001';

export const apollo = new ApolloClient({
  link: new HttpLink({ uri: `${API_URL}/graphql` }),
  cache: new InMemoryCache(),
});
