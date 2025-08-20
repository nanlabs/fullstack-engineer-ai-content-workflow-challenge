export type LicenseStatus = 'pending' | 'negotiation' | 'approved' | 'rejected';

export interface Song {
  id: string;
  title: string;
  artist: string;
  durationSec?: number | null;
}

export interface Track {
  id: string;
  startTime: number;
  endTime: number;
  licenseStatus: LicenseStatus;
  song: Song | null;
}

export interface Scene {
  id: string;
  name: string;
  description?: string | null;
  tracks: Track[];
}

export interface Movie {
  id: string;
  title: string;
  description?: string | null;
  scenes: Scene[];
}

export interface MovieSummary {
  id: string;
  title: string;
  description?: string | null;
  summary: {
    totalScenes: number;
    totalTracks: number;
    withSong: number;
    pending: number;
    negotiation: number;
    approved: number;
    rejected: number;
  };
}

export const STATUS_OPTIONS = ['PENDING','NEGOTIATION','APPROVED','REJECTED'] as const;
export type LicenseStatusGQL = typeof STATUS_OPTIONS[number];