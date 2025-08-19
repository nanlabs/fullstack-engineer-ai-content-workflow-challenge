import type { Movie } from '../types'

// TODO: read it from .env
const API_URL = 'http://localhost:3001';

export async function getMovies(): Promise<Movie[]> {
  try {
    const res = await fetch(`${API_URL}/movie`);
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