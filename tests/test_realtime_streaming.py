"""Pattern #4 — Browser → WS/SSE → Gateway → Pub/Sub → Workers."""

from shelfsight.gateway.sse_handler import SseHandler
from shelfsight.gateway.ws_handler import WebSocketHandler
from shelfsight.pubsub.broker import CHANNEL, PubSubBroker
from shelfsight.pubsub.subscriber import STAGES, StageSubscriber


def test_broker_fanout():
    broker = PubSubBroker()
    seen: list[dict] = []
    broker.subscribe(CHANNEL, seen.append)
    n_subs = broker.publish(CHANNEL, {"text": "hello"})
    assert n_subs == 1 and seen[0]["text"] == "hello"


def test_websocket_runs_all_stages():
    result = WebSocketHandler().handle_frame({"text": "payload"})
    assert all(result[stage] is True for stage in STAGES)
    assert result["event_type"] == "ShelfFrame"


def test_sse_stream_completes():
    events = list(SseHandler().stream({"text": "payload"}))
    names = [item["event"] for item in events]
    assert names[-1] == "complete"
    assert names[:-1] == list(STAGES)
    assert isinstance(StageSubscriber, type)
