'use client';
import { useEffect } from 'react';

type ToastProps = {
  message: string;
  onClose: () => void;
};

export default function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, 4000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 bg-black text-white text-sm px-4 py-2 rounded shadow-lg animate-fade-in">
      {message}
    </div>
  );
}
