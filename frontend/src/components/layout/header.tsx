import { cn } from "@/lib/utils";

interface HeaderProps {
  sseConnected?: boolean | null;
}

export function Header({ sseConnected = null }: HeaderProps) {
  return (
    <header className="bg-background flex items-center justify-between border-b px-6 py-3">
      <div className="flex items-center gap-3">
        <span className="text-muted-foreground text-sm font-bold tracking-widest uppercase">
          ACME GLOBAL MEDIA
        </span>
        <span className="text-muted-foreground">|</span>
        <span className="text-sm font-semibold">Content Workflow</span>
      </div>
      <SseIndicator connected={sseConnected} />
    </header>
  );
}

function SseIndicator({ connected }: { connected: boolean | null }) {
  return (
    <div className="text-muted-foreground flex items-center gap-2 text-xs">
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          connected === true && "bg-green-500",
          connected === false && "bg-red-500",
          connected === null && "bg-gray-400"
        )}
      />
      <span>
        {connected === true ? "Live" : connected === false ? "Disconnected" : "No campaign"}
      </span>
    </div>
  );
}
