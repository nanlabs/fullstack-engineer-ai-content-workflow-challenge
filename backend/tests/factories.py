"""Model factories for test data generation."""

from __future__ import annotations

from faker import Faker

from src.db.enums import ContentPieceType, DraftStatus
from src.db.models.campaign import Campaign
from src.db.models.content_piece import ContentPiece
from src.db.models.draft import Draft

_faker = Faker()


class CampaignFactory:
    @staticmethod
    def build(**overrides: object) -> Campaign:
        defaults: dict[str, object] = {
            "name": _faker.bs(),
            "brief": _faker.text(max_nb_chars=200),
            "source_language": "en",
            "target_languages": ["es", "pt-BR"],
        }
        return Campaign(**{**defaults, **overrides})


class ContentPieceFactory:
    @staticmethod
    def build(campaign: Campaign, **overrides: object) -> ContentPiece:
        defaults: dict[str, object] = {
            "campaign_id": campaign.id,
            "type": ContentPieceType.headline,
            "title": _faker.sentence(nb_words=4),
            "source_text": _faker.sentence(),
        }
        return ContentPiece(**{**defaults, **overrides})


class DraftFactory:
    @staticmethod
    def build(content_piece: ContentPiece, **overrides: object) -> Draft:
        defaults: dict[str, object] = {
            "content_piece_id": content_piece.id,
            "language": "en",
            "status": DraftStatus.suggested,
            "ai_content": _faker.sentence(),
        }
        return Draft(**{**defaults, **overrides})
