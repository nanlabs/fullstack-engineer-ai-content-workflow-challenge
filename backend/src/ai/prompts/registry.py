from __future__ import annotations

from pathlib import Path


class PromptRegistry:
    def __init__(self, base_path: Path) -> None:
        self._base = base_path
        self._cache: dict[str, str] = {}

    def get(self, name: str, version: int = 1) -> str:
        key = f"{name}.v{version}"
        if key not in self._cache:
            path = self._base / f"{key}.md"
            self._cache[key] = path.read_text(encoding="utf-8")
        return self._cache[key]

    def render(self, name: str, version: int = 1, **vars: object) -> str:
        template = self.get(name, version)
        return template.format(**vars)


registry = PromptRegistry(Path(__file__).parent / "templates")
