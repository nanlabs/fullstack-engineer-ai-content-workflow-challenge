import { LoaderCircle } from 'lucide-react';

function Spinner(props: { color: string; size: number }) {
  return (
    <div className="flex items-center justify-center animate-spin">
      <LoaderCircle {...props} />
    </div>
  );
}

export default Spinner;
