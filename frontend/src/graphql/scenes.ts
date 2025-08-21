import { gql } from '@apollo/client';

export const CREATE_SCENE = gql`
  mutation CreateScene($input: CreateSceneInput!) {
    createScene(input: $input) {
      id
      name
      description
      movie { id }
    }
  }
`;
