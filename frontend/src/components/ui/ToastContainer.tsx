"use client";

import React, { useEffect, useState } from "react";
import { Toast } from "./ToastProvider";
import { ToastItem } from "./ToastItem";

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onRemove,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div
      className={`
        fixed bottom-4 right-4 z-50 space-y-2 max-w-sm w-full
        transition-all duration-300 ease-in-out
        ${mounted ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="animate-[slideIn_0.3s_ease-out]"
          style={{
            animation: `
              slideIn 0.3s ease-out,
              fadeIn 0.3s ease-out
            `,
          }}
        >
          <ToastItem toast={toast} onRemove={onRemove} />
        </div>
      ))}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
};
