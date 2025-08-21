export function formatEventMessage(kind: string, at: Date): string {
  const time = at.toLocaleTimeString();

  switch (kind) {
    case 'TRACK_CREATED':
      return `🎵 New track created at ${time}`;
    case 'TRACK_SONG_SET':
      return `🎶 Song assigned to track at ${time}`;
    case 'TRACK_STATUS_UPDATED':
      return `✅ Track status updated at ${time}`;
    case 'SCENE_CREATED':
      return `🎬 New scene created at ${time}`;
    case 'SUMMARY_CHANGED':
      return `📊 Movie summary updated at ${time}`;
    default:
      return `ℹ️ Event: ${kind} at ${time}`;
  }
}