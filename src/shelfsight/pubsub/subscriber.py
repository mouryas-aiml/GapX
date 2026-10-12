"""Worker that applies streaming stages to ShelfFrame messages."""

from __future__ import annotations

from typing import Any

from shelfsight.pubsub.broker import CHANNEL, PubSubBroker

STAGES: tuple[str, ...] = ("segment", "detect", "compliance")


class StageSubscriber:
    def __init__(self, broker: PubSubBroker, channel: str = CHANNEL) -> None:
        self.channel = channel
        self.inbox: list[dict[str, Any]] = []
        self.broker = broker
        broker.subscribe(channel, self.on_message)

    def on_message(self, message: dict[str, Any]) -> None:
        body = dict(message)
        for stage in STAGES:
            body[stage] = True
        body["event_type"] = "ShelfFrame"
        self.inbox.append(body)
