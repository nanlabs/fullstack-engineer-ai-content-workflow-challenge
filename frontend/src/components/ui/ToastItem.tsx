"use client";

import React from "react";
import { Toast } from "./ToastProvider";
import { CheckCircle, CloudAlert, TriangleAlert, Info, X } from "lucide-react";

interface ToastItemProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onRemove }) => {
  const getToastStyles = (type: Toast["type"]) => {
    const baseStyles = "flex items-start p-4 rounded-lg shadow-lg border-l-4";

    switch (type) {
      case "success":
        return `${baseStyles} bg-green-50 border-green-400 text-green-800`;
      case "error":
        return `${baseStyles} bg-red-50 border-red-400 text-red-800`;
      case "warning":
        return `${baseStyles} bg-yellow-50 border-yellow-400 text-yellow-800`;
      case "info":
        return `${baseStyles} bg-blue-50 border-blue-400 text-blue-800`;
      default:
        return `${baseStyles} bg-gray-50 border-gray-400 text-gray-800`;
    }
  };

  const getIcon = (type: Toast["type"]) => {
    switch (type) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case "error":
        return <CloudAlert className="w-5 h-5 text-red-400" />;
      case "warning":
        return <TriangleAlert className="w-5 h-5 text-yellow-400" />;
      case "info":
        return <Info className="w-5 h-5 text-blue-400" />;
      default:
        return null;
    }
  };

  return (
    <div className={getToastStyles(toast.type)}>
      <div className="flex-shrink-0 mr-3">{getIcon(toast.type)}</div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{toast.title}</p>
        {toast.message && (
          <p className="text-sm mt-1 opacity-90">{toast.message}</p>
        )}
      </div>
      <div className="flex-shrink-0 ml-3">
        <button
          onClick={() => onRemove(toast.id)}
          className="inline-flex text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
