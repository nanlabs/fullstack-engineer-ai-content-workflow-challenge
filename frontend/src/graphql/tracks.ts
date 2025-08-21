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

export const UPDATE_TRACK_STATUS = gql`
  mutation UpdateTrackStatus($trackId: ID!, $status: LicenseStatus!) {
    updateTrackStatus(trackId: $trackId, status: $status) {
      id
      licenseStatus
    }
  }
`;

export const CREATE_TRACK = gql`
  mutation CreateTrack($input: CreateTrackInput!) {
    createTrack(input: $input) {
      id
      startTime
      endTime
      licenseStatus
      song { id title artist }
      scene { id movie { id } }
    }
  }
`;