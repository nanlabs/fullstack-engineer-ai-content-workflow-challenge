
'use client';

import { useState } from 'react';
import { useQuery, useSubscription } from '@apollo/client';
import Link from 'next/link';
import { GET_MOVIES, ALL_MOVIES_EVENTS } from '@/graphql/movies';
import type { MovieSummary } from '@/types';
import StatusPill from '@/components/StatusPill';
import Toast from '@/components/Toast';

type GetMoviesData = { movies: MovieSummary[] };

function formatEventMessage(kind: string, at: Date, movieTitle: string): string {
  const time = at.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  switch (kind) {
    case 'TRACK_CREATED':
      return `🎵 New track created in movie "${movieTitle}" at ${time}`;
    case 'TRACK_SONG_SET':
      return `🎶 Song assigned to track in movie "${movieTitle}" at ${time}`;
    case 'TRACK_STATUS_UPDATED':
      return `✅ Track status updated in movie "${movieTitle}" at ${time}`;
    case 'SCENE_CREATED':
      return `🎬 New scene created in movie "${movieTitle}" at ${time}`;
    case 'SUMMARY_CHANGED':
      return `📊 Movie summary updated in movie "${movieTitle}" at ${time}`;
    default:
      return `ℹ️ Event: ${kind} in movie "${movieTitle}" at ${time}`;
  }
}

export default function MovieList() {
  const { data: moviesData, loading, error, refetch } = useQuery<GetMoviesData>(GET_MOVIES);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // NOTE: Currently we trigger a full refetch of the movies list every time
  // `ALL_MOVIES_EVENTS` fires (any track update in any movie).
  // This is simple but not optimal: even if only one movie changed, we refetch them all.
  //
  // TODO(improvement):
  //   - Make the subscription return `{ movieId, summary }`
  //   - Then update only that movie
  //   - This avoids reloading the entire list and reduces unnecessary network traffic.
  useSubscription(ALL_MOVIES_EVENTS, {
    onData: ({ data }) => {
      const event = data.data?.allMoviesEvents;
      if (!event) return;
      setToastMsg(formatEventMessage(event.kind, new Date(event.at), event.movieTitle));
      refetch();
    },
    onError: (e) => console.error('allMoviesEvents sub error', e),
  });
  
  if (loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading movies</div>;
  }

  const movies = moviesData?.movies ?? [];

  if (movies.length === 0) {
    return (
      <div>
        <p className="font-medium">No movies yet</p>
        <p className="text-sm mt-1">Create your first movie to see it here.</p>
      </div>
    );
  }

  return (
    <>
    {toastMsg && (
      <Toast message={toastMsg} onClose={() => setToastMsg(null)} />
    )}
    {/* TODO: add search, filters, pagination */}
    {movies.map((movie) => (
      <div key={movie.id} className="p-4 border rounded shadow" data-testid={`movie-item-${movie.id}`}>
        <h3 className="text-lg font-bold">
          <Link className="underline" href={`/movies/${movie.id}`}>{movie.title}</Link>
        </h3>
        <p className="text-sm text-gray-600">{movie.description || 'No description'}</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <StatusPill label="approved" value={movie.summary.approved} tone="approved" />
          <StatusPill label="negotiation" value={movie.summary.negotiation} tone="negotiation" />
          <StatusPill label="pending" value={movie.summary.pending} tone="pending" />
          <StatusPill label="rejected" value={movie.summary.rejected} tone="rejected" />
        </div>
        <div className="mt-3 text-xs text-slate-500">
          <span className="tabular-nums font-medium">{movie.summary.withSong}</span> / {movie.summary.totalTracks} with song
          <span className="mx-2">·</span>
          <span className="tabular-nums">{movie.summary.totalScenes}</span> scenes
        </div>
      </div>
    ))}
    </>
  );
}