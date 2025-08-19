'use client';

import { useState } from 'react';
import { ApolloProvider, useQuery, useMutation } from '@apollo/client';
import { apollo } from '@/graphql/apollo';
import { GET_SONGS } from '@/graphql/songs';
import { SET_TRACK_SONG } from '@/graphql/tracks';
import { GET_MOVIE } from '@/graphql/movies';
import type { Movie, Song } from '@/types';


type GetMovieVars = { id: string };
type GetMovieData = { movie: Movie | null };

function Detail({ id }: { id: string }) {
  const { data: movieData, loading, error } = useQuery<GetMovieData, GetMovieVars>(GET_MOVIE, { variables: { id } });
  const { data: songsData } = useQuery(GET_SONGS);
  const [setSong, { loading: saving, error: mError }] = useMutation(SET_TRACK_SONG, {
    refetchQueries: [{ query: GET_MOVIE, variables: { id } }],
    awaitRefetchQueries: true,
  });

  const [editingTrackId, setEditingTrackId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error) return <div className="p-6 text-red-600">{error.message}</div>;
  if (!movieData?.movie) return <div className="p-6">Movie not found</div>;

  const movie = movieData.movie;
  const songs: Song[] = songsData?.songs ?? [];

  async function saveSong(trackId: string) {
    if (!selectedSongId) return;
    await setSong({ variables: { trackId, songId: selectedSongId } });
    setEditingTrackId(null);
    setSelectedSongId(null);
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{movie.title}</h1>
        <p className="text-gray-600">{movie.description ?? 'No description'}</p>
      </header>

      {movie.scenes.map((s) => (
        <section key={s.id} className="border rounded p-4 space-y-2">
          <h2 className="font-semibold">{s.name}</h2>
          <div className="divide-y">
            {s.tracks.map((t) => (
              <div key={t.id} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {t.song ? `${t.song.title} — ${t.song.artist}` : 'No song assigned'}
                  </div>
                  <div className="text-xs text-gray-500">[{t.startTime}s → {t.endTime}s]</div>
                </div>

                {t.song ? (
                  <span className="text-xs px-2 py-1 rounded bg-gray-100 shrink-0">
                    {t.licenseStatus}
                  </span>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    {editingTrackId === t.id ? (
                      <>
                        {mError && <div className="text-red-600 text-xs">{mError.message}</div>}
                        {/* TODO: Implement a searchable songs dropdown; debounce input and query backend */}
                        <select
                          className="border rounded px-2 py-1 text-sm"
                          value={selectedSongId || ''}
                          onChange={(e) => setSelectedSongId(e.target.value)}
                        >
                          <option value="">Select song...</option>
                          {songs.map((song) => (
                            <option key={song.id} value={song.id}>
                              {song.title} — {song.artist}
                            </option>
                          ))}
                        </select>
                        <button
                          className="text-xs px-2 py-1 rounded bg-black text-white disabled:opacity-60"
                          disabled={!selectedSongId || saving}
                          onClick={() => saveSong(t.id)}
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          className="text-xs px-2 py-1 rounded border"
                          onClick={() => { setEditingTrackId(null); setSelectedSongId(null); }}
                        >
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className="text-xs px-2 py-1 rounded border"
                        onClick={() => setEditingTrackId(t.id)}
                      >
                        Associate song
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      ))}
    </main>
  );
}

export default function MovieDetailClient({ id }: { id: string }) {
  return (
    <ApolloProvider client={apollo}>
      <Detail id={id} />
    </ApolloProvider>
  );
}
