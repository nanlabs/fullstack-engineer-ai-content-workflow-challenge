
'use client';

import { useEffect, useState } from 'react';
import { getMovies } from '@/lib/api';
import type { Movie } from '../types'

export default function MovieList() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getMovies()
      .then(data => {
        setMovies(data);
        setIsLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setIsLoading(false);
      });
  }, []);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div className="text-red-500">Error loading movies</div>;
  }

  return (
    <>
    {movies?.map((movie) => (
        <div key={movie.id} className="p-4 border rounded shadow">
            <h3 className="text-lg font-bold">{movie.title}</h3>
            <p className="text-sm text-gray-600">{movie.description || 'No description'}</p>
        </div>
    ))}
    </>
  );
}