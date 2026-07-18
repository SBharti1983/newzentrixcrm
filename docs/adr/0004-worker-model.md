# ADR 0004: Background Jobs Worker Daemon (`apps/worker`)

* **Status:** Accepted
* **Date:** 2026-07-14

## Context and Problem
Running scheduled maintenance loops, automated customer nurture follow-ups, storage cleanup check, and bulk email alerts inside the HTTP API thread blocks the Node event loop and increases endpoint response times.

## Decision
We create a dedicated background worker (`apps/worker`):
1. **Cron schedules:** Runs interval jobs (like nurture autopilot scans and call recording deletions) in isolation.
2. **Process isolation:** Prevents the main Express API server `apps/api` from instantiating any background interval schedules.
3. **Event-driven execution:** Consumer binds to `@zentrix/events` to reactively execute alerts or document indexing in the background.

## Consequences
* **Pros:** Highly responsive API server, clean separation of CRUD loads from batch loads, and isolated failures.
* **Cons:** Requires running another Node daemon in the production cluster.
