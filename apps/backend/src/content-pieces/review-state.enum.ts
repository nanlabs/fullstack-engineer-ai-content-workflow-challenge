import { registerEnumType } from '@nestjs/graphql';

export enum ReviewState {
  Draft = 'Draft',
  SuggestedByAI = 'Suggested by AI',
  Reviewed = 'Reviewed',
  Approved = 'Approved',
  Rejected = 'Rejected',
}

registerEnumType(ReviewState, {
  name: 'ReviewState',
  description: 'The review state of a content piece.',
});
