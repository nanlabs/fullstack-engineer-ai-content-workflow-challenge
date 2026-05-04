import { QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiError } from "@/api/client";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: (count, error) => {
        if (error instanceof ApiError && error.status >= 400 && error.status < 500) {
          return false;
        }
        return count < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      onError: (err) => {
        if (err instanceof ApiError) {
          toast.error(err.message);
        }
      },
    },
  },
});
