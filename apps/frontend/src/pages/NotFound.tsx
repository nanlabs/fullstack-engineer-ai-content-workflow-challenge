import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="h-dvh w-dvh flex flex-col items-center justify-center">
      <h1 className="my-8 text-gray-300 font-bold">404 - Page Not Found</h1>
      <p>The page you are looking for does not exist.</p>
      <Link to="/" className="text-blue-300 underline">
        Go back to home
      </Link>
    </div>
  );
};

export default NotFound;
