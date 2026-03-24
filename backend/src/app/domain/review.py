from app.domain.enums import ReviewActionType, ReviewState


class InvalidReviewTransition(ValueError):
    pass


VALID_TRANSITIONS: dict[ReviewState, set[ReviewActionType]] = {
    ReviewState.DRAFT: {ReviewActionType.START_REVIEW, ReviewActionType.REJECT},
    ReviewState.AI_SUGGESTED: {
        ReviewActionType.START_REVIEW,
        ReviewActionType.ACCEPT,
        ReviewActionType.EDIT,
        ReviewActionType.REJECT,
    },
    ReviewState.IN_REVIEW: {
        ReviewActionType.START_REVIEW,
        ReviewActionType.ACCEPT,
        ReviewActionType.EDIT,
        ReviewActionType.REJECT,
    },
    ReviewState.APPROVED: {ReviewActionType.START_REVIEW},
    ReviewState.REJECTED: {ReviewActionType.START_REVIEW},
}


def ensure_transition(current_state: ReviewState, action: ReviewActionType) -> ReviewState:
    if action not in VALID_TRANSITIONS[current_state]:
        raise InvalidReviewTransition(
            f"Action '{action}' is not allowed from state '{current_state}'."
        )

    if action == ReviewActionType.START_REVIEW:
        return ReviewState.IN_REVIEW
    if action in {ReviewActionType.ACCEPT, ReviewActionType.EDIT}:
        return ReviewState.APPROVED
    if action == ReviewActionType.REJECT:
        return ReviewState.REJECTED

    raise InvalidReviewTransition(f"Unsupported action '{action}'.")
