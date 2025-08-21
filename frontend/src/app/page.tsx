import MovieList from '@/components/MovieList';

export default function Home() {
  return (
    <main className="p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">ACME BROS - Music Licensing</h1>
      
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Movies</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="movies-list">
          <MovieList />
        </div>
      </section>
    </main>
  );
}
