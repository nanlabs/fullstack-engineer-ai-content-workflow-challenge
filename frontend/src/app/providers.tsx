'use client';
import { ApolloProvider } from '@apollo/client';
import { apollo } from '@/graphql/apollo';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ApolloProvider client={apollo}>{children}</ApolloProvider>;
}
