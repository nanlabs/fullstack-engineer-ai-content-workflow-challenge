import { gql } from '@apollo/client';

export const GET_MOVIE = gql`
  query GetMovie($id: ID!) {
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