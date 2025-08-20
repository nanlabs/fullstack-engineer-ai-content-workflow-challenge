import { gql } from '@apollo/client';

export const GET_MOVIE = gql`
  query Movie($id: ID!) {
    movie(id: $id) {
      id
      title
      description
      scenes {
        id
        name
        description
        tracks {
          id
          startTime
          endTime
          licenseStatus
          song { id title artist }
        }
      }
    }
  }
`;

export const GET_MOVIES = gql`
  query Movies {
    movies {
      id
      title
      description
      summary {
        totalScenes
        totalTracks
        withSong
        pending
        negotiation
        approved
        rejected
      }
    }
  }
`;

export const MOVIE_SUMMARY_CHANGED = gql`
  subscription MovieSummaryChanged {
    movieSummaryChanged
  }
`;