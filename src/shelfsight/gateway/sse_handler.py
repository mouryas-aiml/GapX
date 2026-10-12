"""SSE-shaped handler: yield named events as stages complete."""

from __future__ import annotations

from collections.abc import Iterator
from typing import Any

from shelfsight.gateway.ws_handler import WebSocketHandler
from shelfsight.pubsub.subscriber import STAGES


class SseHandler:
    def __init__(self, ws: WebSocketHandler | None = None) -> None:
        self.ws = ws or WebSocketHandler()

    def stream(self, frame: dict[str, Any]) -> Iterator[dict[str, Any]]:
        result = self.ws.handle_frame(frame)
        for stage in STAGES:
            yield {"event": stage, "data": {stage: result[stage]}}
        yield {"event": "complete", "data": result}
