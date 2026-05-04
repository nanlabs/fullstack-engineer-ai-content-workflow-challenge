#!/bin/sh
set -e

alembic upgrade head
python -m scripts.seed --idempotent
exec uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload
