"""WebSocket-shaped handler: each client frame is published then streamed back."""

from __future__ import annotations

from typing import Any

from shelfsight.pubsub.broker import CHANNEL, PubSubBroker
from shelfsight.pubsub.subscriber import StageSubscriber


class WebSocketHandler:
    def __init__(self, broker: PubSubBroker | None = None) -> None:
        self.broker = broker or PubSubBroker()
        self.subscriber = StageSubscriber(self.broker)

    def handle_frame(self, frame: dict[str, Any]) -> dict[str, Any]:
        self.broker.publish(CHANNEL, frame)
        return self.subscriber.inbox[-1]
