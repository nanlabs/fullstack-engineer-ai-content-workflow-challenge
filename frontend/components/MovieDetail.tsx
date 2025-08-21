'use client';

import { useState } from 'react';
import { ApolloProvider, useQuery, useMutation, useSubscription } from '@apollo/client';
import { apollo } from '@/graphql/apollo';
import { GET_SONGS } from '@/graphql/songs';
import { SET_TRACK_SONG, UPDATE_TRACK_STATUS, TRACK_UPDATED_SUBSCRIPTION } from '@/graphql/tracks';
import { GET_MOVIE } from '@/graphql/movies';
import type { Movie, Song } from '@/types';
import CreateTrackForm from '@/components/CreateTrackForm';

type GetMovieVars = { id: string };
type GetMovieData = { movie: Movie | null };

// GQL enum tokens (uppercase)
const STATUS_OPTIONS = ['PENDING', 'NEGOTIATION', 'APPROVED', 'REJECTED'] as const;
type LicenseStatusGQL = typeof STATUS_OPTIONS[number];

function Detail({ id }: { id: string }) {
  const { data: movieData, loading, error, refetch } = useQuery<GetMovieData, GetMovieVars>(GET_MOVIE, { variables: { id } });
  const { data: songsData } = useQuery<{ songs: Song[] }>(GET_SONGS);

  // --- subscription for updates in real time ---
  useSubscription(TRACK_UPDATED_SUBSCRIPTION, {
    variables: { movieId: id },
    onData: ({ data }) => {
      const updatedTrack = data.data?.trackUpdated;
      if (updatedTrack) {
        refetch();
      }
    },
    onError: (error) => {
      console.error('Subscription error:', error);
    }
  });

  // --- mutations ---
  const [setSong, { loading: savingSong, error: errSong }] = useMutation(SET_TRACK_SONG, {
    refetchQueries: [{ query: GET_MOVIE, variables: { id } }],
    awaitRefetchQueries: true,
  });

  const [updateStatus, { loading: savingStatus, error: errStatus }] = useMutation(UPDATE_TRACK_STATUS, {
    refetchQueries: [{ query: GET_MOVIE, variables: { id } }],
    awaitRefetchQueries: true,
  });

  // --- associate song UI state ---
  const [editingSongTrackId, setEditingSongTrackId] = useState<string | null>(null);
  const [selectedSongId, setSelectedSongId] = useState<string | null>(null);

  // --- change status UI state ---
  const [editingStatusTrackId, setEditingStatusTrackId] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<LicenseStatusGQL | null>(null);

  // --- track creation UI state ---
  const [creatingSceneId, setCreatingSceneId] = useState<string | null>(null);

  if (loading) return <div className="p-6">Loading...</div>;
  if (error)   return <div className="p-6 text-red-600">{error.message}</div>;
  if (!movieData?.movie) return <div className="p-6">Movie not found</div>;

  const movie = movieData.movie;
  const songs = songsData?.songs ?? [];

  async function saveSong(trackId: string) {
    if (!selectedSongId) return;
    await setSong({ variables: { trackId, songId: selectedSongId } });
    setEditingSongTrackId(null);
    setSelectedSongId(null);
  }

  async function saveStatus(trackId: string) {
    if (!selectedStatus) return;
    await updateStatus({ variables: { trackId, status: selectedStatus } });
    setEditingStatusTrackId(null);
    setSelectedStatus(null);
  }

  return (
    <main className="p-6 max-w-5xl mx-auto space-y-6">
      <header>
        <h1 className="text-2xl font-bold">{movie.title}</h1>
        <p className="text-gray-600">{movie.description ?? 'No description'}</p>
      </header>

      {movie.scenes.length === 0 ? (
        <p className="text-sm text-gray-500">No scenes yet.</p>
      ) : movie.scenes.map((s) => (
        <section key={s.id} className="border rounded p-4 space-y-2">
          <h2 className="font-semibold">{s.name}</h2>

          {/* Create track toggle */}
          {creatingSceneId === s.id ? (
            <div className="space-y-2">
              <CreateTrackForm
                sceneId={s.id}
                onCancel={() => setCreatingSceneId(null)}
              />
            </div>
          ) : (
            <button
              className="text-xs px-2 py-1 rounded border"
              onClick={() => setCreatingSceneId(s.id)}
            >
              Create track
            </button>
          )}

          {/* existing tracks list */}
          <div className="divide-y">
            {s.tracks.slice().sort((a,b) => a.startTime - b.startTime).map((t) =>{
              const hasSong = !!t.song;
              const current: LicenseStatusGQL = (t.licenseStatus as string).toUpperCase() as LicenseStatusGQL;

              const updatingStatus = editingStatusTrackId === t.id;
              const settingSong = editingSongTrackId === t.id;

              return (
                <div key={t.id} className="py-2 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">
                      {t.song ? `${t.song.title} — ${t.song.artist}` : 'No song assigned'}
                    </div>
                    <div className="text-xs text-gray-500">[{t.startTime}s → {t.endTime}s]</div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    
                    {/* --- Status UI: only when there is a song --- */}
                    {hasSong && (
                      updatingStatus ? (
                        <>
                          <select
                            className="border rounded px-2 py-1 text-xs"
                            value={selectedStatus ?? current}
                            onChange={(e) => setSelectedStatus(e.target.value as LicenseStatusGQL)}
                            disabled={savingStatus || savingSong}
                            title="Update license status"
                          >
                            {STATUS_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt}</option>
                            ))}
                          </select>
                          <button
                            className="text-xs px-2 py-1 rounded bg-black text-white disabled:opacity-60"
                            disabled={savingStatus || (selectedStatus ?? current) === current || savingSong}
                            onClick={() => saveStatus(t.id)}
                          >
                            {savingStatus ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            onClick={() => { setEditingStatusTrackId(null); setSelectedStatus(null); }}
                          >
                            Cancel
                          </button>
                          {errStatus && <div className="text-xs text-red-600">{errStatus.message}</div>}
                        </>
                      ) : (
                        <>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100">{current}</span>
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            onClick={() => { setEditingStatusTrackId(t.id); setSelectedStatus(current); }}
                          >
                            Change status
                          </button>
                        </>
                      )
                    )}

                    {/* --- Associate song (only when empty) --- */}
                    {!hasSong && (
                      settingSong ? (
                        <>
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
                            disabled={!selectedSongId || savingSong}
                            onClick={() => saveSong(t.id)}
                          >
                            {savingSong ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            onClick={() => { setEditingSongTrackId(null); setSelectedSongId(null); }}
                          >
                            Cancel
                          </button>
                          {errSong && <div className="text-xs text-red-600">{errSong.message}</div>}
                        </>
                      ) : (
                        <button
                          className="text-xs px-2 py-1 rounded border"
                          onClick={() => { setEditingSongTrackId(t.id); setSelectedSongId(null); }}
                        >
                          Associate song
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
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
