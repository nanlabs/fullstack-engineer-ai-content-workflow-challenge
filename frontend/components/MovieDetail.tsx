'use client';

import { ApolloProvider, gql, useQuery } from '@apollo/client';
import { apollo } from '@/lib/apollo';
import type { Movie } from '@/types';

const GET_MOVIE = gql`
  query GetMovie($id: ID!) {
    movie(id: $id) {
      id
      title
      description
      scenes {
        id
        name
        description
        tracks {
          id
          startTime
          endTime
          licenseStatus
          song { id title artist }
        }
      }
    }
  }
`;

type GetMovieVars = { id: string };
type GetMovieData = { movie: Movie | null };

function Detail({ id }: { id: string }) {
  const { data, loading, error } = useQuery<GetMovieData, GetMovieVars>(GET_MOVIE, { variables: { id } });

  if (loading) return <div className="p-6">Loading…</div>;
  if (error)   return <div className="p-6 text-red-600">{error.message}</div>;
  const m = data?.movie;
  if (!m) return <div className="p-6">Movie not found</div>;

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{m.title}</h1>
        <p className="text-gray-600">{m.description ?? 'No description'}</p>
      </header>

      {m.scenes.map((s) => (
        <section key={s.id} className="border rounded p-4 space-y-2">
          <h2 className="font-semibold">{s.name}</h2>
          <div className="divide-y">
            {s.tracks.map((t) => (
              <div key={t.id} className="py-2 flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium">
                    {t.song ? `${t.song.title} — ${t.song.artist}` : 'No song assigned'}
                  </div>
                  <div className="text-xs text-gray-500">[{t.startTime}s → {t.endTime}s]</div>
                </div>
                <span className="text-xs px-2 py-1 rounded bg-gray-100">{t.licenseStatus}</span>
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export default function MovieDetail({ id }: { id: string }) {
  return (
    <ApolloProvider client={apollo}>
      <Detail id={id} />
    </ApolloProvider>
  );
}
