import { gql } from '@apollo/client';

export const SET_TRACK_SONG = gql`
  mutation SetTrackSong($trackId: ID!, $songId: ID!) {
    setTrackSong(trackId: $trackId, songId: $songId) {
      id
      startTime
      endTime
      licenseStatus
      song { id title artist }
    }
  }
`;