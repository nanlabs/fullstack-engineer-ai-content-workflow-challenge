import type { Movie } from '../types'

export async function getMovies(): Promise<Movie[]> {
  try {
    const res = await fetch('http://localhost:3001/movie');
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(`Failed to fetch movies: ${res.status} - ${JSON.stringify(errorData)}`);
    }
    const data = await res.json();
    console.log('Movies data:', data);
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}