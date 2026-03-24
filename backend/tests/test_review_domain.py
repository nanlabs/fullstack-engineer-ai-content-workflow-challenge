import pytest

from app.domain.enums import ReviewActionType, ReviewState
from app.domain.review import InvalidReviewTransition, ensure_transition


def test_valid_review_transitions() -> None:
    assert ensure_transition(ReviewState.DRAFT, ReviewActionType.START_REVIEW) == ReviewState.IN_REVIEW
    assert ensure_transition(ReviewState.AI_SUGGESTED, ReviewActionType.ACCEPT) == ReviewState.APPROVED
    assert ensure_transition(ReviewState.IN_REVIEW, ReviewActionType.EDIT) == ReviewState.APPROVED
    assert ensure_transition(ReviewState.IN_REVIEW, ReviewActionType.REJECT) == ReviewState.REJECTED


def test_invalid_review_transition() -> None:
    with pytest.raises(InvalidReviewTransition):
        ensure_transition(ReviewState.DRAFT, ReviewActionType.ACCEPT)
