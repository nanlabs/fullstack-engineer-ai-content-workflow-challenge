import MovieDetail from '@/components/MovieDetail';

type Params = { id: string };

export default async function Page({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  return <MovieDetail id={id} />;
}
