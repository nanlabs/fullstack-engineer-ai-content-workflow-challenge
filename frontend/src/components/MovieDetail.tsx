'use client';

import { useState } from 'react';
import { useQuery, useMutation, useSubscription, useLazyQuery } from '@apollo/client';
import { GET_SONGS } from '@/graphql/songs';
import { SET_TRACK_SONG, UPDATE_TRACK_STATUS } from '@/graphql/tracks';
import { GET_MOVIE, MOVIE_EVENTS_SUB } from '@/graphql/movies';
import type { Movie, Song } from '@/types';
import CreateTrackForm from '@/components/CreateTrackForm';
import CreateSceneForm from '@/components/CreateSceneForm';
import Toast from '@/components/Toast';

type GetMovieVars = { id: string };
type GetMovieData = { movie: Movie | null };

// GQL enum tokens (uppercase)
const STATUS_OPTIONS = ['PENDING', 'NEGOTIATION', 'APPROVED', 'REJECTED'] as const;
type LicenseStatusGQL = typeof STATUS_OPTIONS[number];

function formatEventMessage(kind: string, at: Date): string {
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  switch (kind) {
    case 'TRACK_CREATED':
      return `🎵 New track created at ${time}`;
    case 'TRACK_SONG_SET':
      return `🎶 Song assigned to track at ${time}`;
    case 'TRACK_STATUS_UPDATED':
      return `✅ Track status updated at ${time}`;
    case 'SCENE_CREATED':
      return `🎬 New scene created at ${time}`;
    case 'SUMMARY_CHANGED':
      return `📊 Movie summary updated at ${time}`;
    default:
      return `ℹ️ Event: ${kind} at ${time}`;
  }
}

export default function MovieDetail({ id }: { id: string }) {
  const { data: movieData, loading, error, refetch } = useQuery<GetMovieData, GetMovieVars>(GET_MOVIE, { variables: { id } });
  // NOTE: Fetch songs on-demand only when user starts associating a song.
  const [loadSongs, { data: songsData }] = useLazyQuery<{ songs: Song[] }>(GET_SONGS);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // --- subscription for updates in real time ---
  useSubscription(MOVIE_EVENTS_SUB, {
    variables: { movieId: id },
    onData: ({ data }) => {
      const event = data.data?.movieEvents;
      if (!event) return;

      setToastMsg(formatEventMessage(event.kind, new Date(event.at)));
      refetch();
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
  const [creatingTrackSceneId, setCreatingTrackSceneId] = useState<string | null>(null);

  // --- scene creation UI state ---
  const [creatingScene, setCreatingScene] = useState(false);

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
      {toastMsg && (
        <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
      )}

      <header>
        <h1 className="text-2xl font-bold" data-testid="movie-title">{movie.title}</h1>
        <p className="text-gray-600">{movie.description ?? 'No description'}</p>
      </header>

      <div className="mt-3">
        {creatingScene ? (
          <CreateSceneForm
            movieId={movie.id}
            onCancel={() => setCreatingScene(false)}
            onCreated={() => setCreatingScene(false)}
          />
        ) : (
          <button
            className="text-xs px-2 py-1 rounded border"
            onClick={() => setCreatingScene(true)}
          >
            Create scene
          </button>
        )}
      </div>

      {movie.scenes.length === 0 ? (
        <p className="text-sm text-gray-500">No scenes yet.</p>
      ) : movie.scenes.map((s) => (
        <section key={s.id} className="border rounded p-4 space-y-2" data-testid="scene-section">
          <h2 className="font-semibold">{s.name}</h2>
          <p className="text-gray-600">{s.description ?? 'No description'}</p>

          {/* Create track toggle */}
          {creatingTrackSceneId === s.id ? (
            <div className="space-y-2">
              <CreateTrackForm
                sceneId={s.id}
                onCancel={() => setCreatingTrackSceneId(null)}
                onCreated={() => setCreatingTrackSceneId(null)}
              />
            </div>
          ) : (
            <button
              className="text-xs px-2 py-1 rounded border"
              onClick={() => setCreatingTrackSceneId(s.id)}
            >
              Create track
            </button>
          )}

          {/* existing tracks list */}
          <div className="divide-y">
            {s.tracks.slice().sort((a,b) => a.startTime - b.startTime).map((t) =>{
              const hasSong = !!t.song;
              const current: LicenseStatusGQL = t.licenseStatus as LicenseStatusGQL;

              const updatingStatus = editingStatusTrackId === t.id;
              const settingSong = editingSongTrackId === t.id;

              return (
                <div key={t.id} className="py-2 flex items-center justify-between gap-3" data-testid="track-row">
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
                            data-testid="track-status-select"
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
                            data-testid="track-save-status"
                            disabled={savingStatus || (selectedStatus ?? current) === current || savingSong}
                            onClick={() => saveStatus(t.id)}
                          >
                            {savingStatus ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            data-testid="track-cancel-status"
                            onClick={() => { setEditingStatusTrackId(null); setSelectedStatus(null); }}
                          >
                            Cancel
                          </button>
                          {errStatus && <div className="text-xs text-red-600">{errStatus.message}</div>}
                        </>
                      ) : (
                        <>
                          <span className="text-xs px-2 py-1 rounded bg-gray-100" data-testid="track-status">{current}</span>
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            data-testid="track-change-status"
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
                            data-testid="track-song-select"
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
                            data-testid="track-save-song"
                            disabled={!selectedSongId || savingSong}
                            onClick={() => saveSong(t.id)}
                          >
                            {savingSong ? 'Saving...' : 'Save'}
                          </button>
                          <button
                            className="text-xs px-2 py-1 rounded border"
                            data-testid="track-cancel-assoc"
                            onClick={() => { setEditingSongTrackId(null); setSelectedSongId(null); }}
                          >
                            Cancel
                          </button>
                          {errSong && <div className="text-xs text-red-600">{errSong.message}</div>}
                        </>
                      ) : (
                        <button
                          className="text-xs px-2 py-1 rounded border"
                          onClick={() => { setEditingSongTrackId(t.id); setSelectedSongId(null); loadSongs(); }}
                          data-testid="track-assoc-btn"
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
