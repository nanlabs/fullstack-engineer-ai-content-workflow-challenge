"""initial schema

Revision ID: dff167946cbf
Revises:
Create Date: 2026-04-27 13:33:49.707187

"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "dff167946cbf"
down_revision: str | Sequence[str] | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_UUID = postgresql.UUID(as_uuid=True)
_NOW = sa.text("now()")
_GEN_UUID = sa.text("gen_random_uuid()")


def upgrade() -> None:
    # --- Enums (must exist before tables that reference them) ---
    op.execute("CREATE TYPE content_piece_type AS ENUM ('headline', 'description', 'cta', 'body')")
    op.execute(
        "CREATE TYPE draft_status AS ENUM"
        " ('draft', 'suggested', 'reviewed', 'approved', 'rejected')"
    )
    op.execute(
        "CREATE TYPE workflow_status AS ENUM"
        " ('pending', 'running', 'awaiting_human', 'completed', 'failed')"
    )

    # --- Trigger function for updated_at ---
    op.execute("""
        CREATE OR REPLACE FUNCTION set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql
    """)

    # --- campaign ---
    op.create_table(
        "campaign",
        sa.Column("id", _UUID, primary_key=True, server_default=_GEN_UUID),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("brief", sa.Text(), nullable=True),
        sa.Column(
            "target_languages",
            postgresql.ARRAY(sa.String(10)),
            nullable=False,
            server_default="{}",
        ),
        sa.Column("source_language", sa.String(10), nullable=False, server_default="en"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.execute("""
        CREATE TRIGGER campaign_updated_at
        BEFORE UPDATE ON campaign
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    """)

    # --- prompt_template (referenced by draft, must come before) ---
    op.create_table(
        "prompt_template",
        sa.Column("id", _UUID, primary_key=True, server_default=_GEN_UUID),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("template", sa.Text(), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("default_model", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.UniqueConstraint("name", "version", name="uq_prompt_template_name_version"),
    )

    # --- content_piece ---
    _cp_type = postgresql.ENUM(name="content_piece_type", create_type=False)
    op.create_table(
        "content_piece",
        sa.Column("id", _UUID, primary_key=True, server_default=_GEN_UUID),
        sa.Column(
            "campaign_id",
            _UUID,
            sa.ForeignKey("campaign.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("type", _cp_type, nullable=False),
        sa.Column("source_text", sa.Text(), nullable=True),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.execute(
        "CREATE INDEX ix_content_piece_campaign_created"
        " ON content_piece (campaign_id, created_at DESC)"
    )
    op.execute("""
        CREATE TRIGGER content_piece_updated_at
        BEFORE UPDATE ON content_piece
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    """)

    # --- draft ---
    _ds_type = postgresql.ENUM(name="draft_status", create_type=False)
    op.create_table(
        "draft",
        sa.Column("id", _UUID, primary_key=True, server_default=_GEN_UUID),
        sa.Column(
            "content_piece_id",
            _UUID,
            sa.ForeignKey("content_piece.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("language", sa.String(10), nullable=False),
        sa.Column("status", _ds_type, nullable=False, server_default="draft"),
        sa.Column("ai_content", sa.Text(), nullable=True),
        sa.Column("edited_content", sa.Text(), nullable=True),
        sa.Column("model_used", sa.String(100), nullable=True),
        sa.Column("provider", sa.String(50), nullable=True),
        sa.Column(
            "prompt_template_id",
            _UUID,
            sa.ForeignKey("prompt_template.id"),
            nullable=True,
        ),
        sa.Column("metadata", postgresql.JSONB(), nullable=True),
        sa.Column("parent_draft_id", _UUID, sa.ForeignKey("draft.id"), nullable=True),
        sa.Column("reviewed_by", sa.String(100), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("review_notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
    )
    op.execute(
        "CREATE INDEX ix_draft_content_piece_language_created"
        " ON draft (content_piece_id, language, created_at DESC)"
    )
    op.create_index("ix_draft_status", "draft", ["status"])
    op.execute("""
        CREATE TRIGGER draft_updated_at
        BEFORE UPDATE ON draft
        FOR EACH ROW EXECUTE FUNCTION set_updated_at()
    """)

    # --- workflow_run ---
    _ws_type = postgresql.ENUM(name="workflow_status", create_type=False)
    op.create_table(
        "workflow_run",
        sa.Column("id", _UUID, primary_key=True, server_default=_GEN_UUID),
        sa.Column(
            "content_piece_id",
            _UUID,
            sa.ForeignKey("content_piece.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("langgraph_thread_id", sa.String(100), nullable=False),
        sa.Column("status", _ws_type, nullable=False, server_default="pending"),
        sa.Column("current_node", sa.String(100), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False, server_default=_NOW),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.execute(
        "CREATE INDEX ix_workflow_run_content_piece_started"
        " ON workflow_run (content_piece_id, started_at DESC)"
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_workflow_run_content_piece_started")
    op.drop_table("workflow_run")

    op.execute("DROP TRIGGER IF EXISTS draft_updated_at ON draft")
    op.execute("DROP INDEX IF EXISTS ix_draft_status")
    op.execute("DROP INDEX IF EXISTS ix_draft_content_piece_language_created")
    op.drop_table("draft")

    op.execute("DROP TRIGGER IF EXISTS content_piece_updated_at ON content_piece")
    op.execute("DROP INDEX IF EXISTS ix_content_piece_campaign_created")
    op.drop_table("content_piece")

    op.drop_table("prompt_template")

    op.execute("DROP TRIGGER IF EXISTS campaign_updated_at ON campaign")
    op.drop_table("campaign")

    op.execute("DROP FUNCTION IF EXISTS set_updated_at()")

    op.execute("DROP TYPE IF EXISTS workflow_status")
    op.execute("DROP TYPE IF EXISTS draft_status")
    op.execute("DROP TYPE IF EXISTS content_piece_type")
