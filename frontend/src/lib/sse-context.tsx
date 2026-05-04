import { createContext, useContext, useState } from "react";

interface SseContextValue {
  connected: boolean | null;
  setConnected: (v: boolean | null) => void;
}

const SseContext = createContext<SseContextValue>({
  connected: null,
  setConnected: () => {},
});

export function SseProvider({ children }: { children: React.ReactNode }) {
  const [connected, setConnected] = useState<boolean | null>(null);
  return <SseContext.Provider value={{ connected, setConnected }}>{children}</SseContext.Provider>;
}

export function useSseContext() {
  return useContext(SseContext);
}
