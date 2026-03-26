from __future__ import annotations

import json
import re


def parse_translation_output(raw_text: str) -> str:
    text = raw_text.strip()
    if not text:
        raise ValueError("Translation response was empty.")

    parsed = _try_parse_json(text)
    if isinstance(parsed, str):
        return parsed.strip()
    if isinstance(parsed, dict):
        translation = parsed.get("translation")
        if isinstance(translation, str) and translation.strip():
            return translation.strip()

    fenced_match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if fenced_match:
        fenced_content = fenced_match.group(1).strip()
        parsed = _try_parse_json(fenced_content)
        if isinstance(parsed, str):
            return parsed.strip()
        if isinstance(parsed, dict):
            translation = parsed.get("translation")
            if isinstance(translation, str) and translation.strip():
                return translation.strip()
        if fenced_content:
            return fenced_content

    start = text.find("{")
    end = text.rfind("}")
    if start != -1 and end != -1 and end > start:
        parsed = _try_parse_json(text[start : end + 1])
        if isinstance(parsed, dict):
            translation = parsed.get("translation")
            if isinstance(translation, str) and translation.strip():
                return translation.strip()

    return text


def _try_parse_json(candidate: str) -> object | None:
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        return None
