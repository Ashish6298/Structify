# Event Persistence

Session events are serializable as newline-delimited JSON.

`structify init --event-log` writes `.structify/events.ndjson` in the generated project. Replay utilities can load this log and reconstruct a high-level timeline for future inspect, repair, or upgrade workflows.
