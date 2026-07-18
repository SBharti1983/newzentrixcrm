# ADR 0001: Monorepo Architecture using Turborepo

* **Status:** Accepted
* **Date:** 2026-07-14

## Context and Problem
As ZentrixCRM grows from a single API server to an ecosystem containing React client dashboards, dedicated AI voice event loops (digital employees), and offline workers, managing them in separated repositories creates massive dependency synchronisation issues (e.g. types drift, api contract breaks).

## Decision
We utilize a unified Monorepo structure powered by **Turborepo** and **npm workspaces**:
1. All client applications (`apps/crm-web`, `apps/admin`) and daemon microservices (`apps/api`, `apps/digital-employee`, `apps/worker`) live in `apps/`.
2. Shared packages (`@zentrix/contracts`, `@zentrix/events`, `@zentrix/observability`, `@zentrix/database`) live under `packages/` and are symlinked instantly locally.

## Consequences
* **Pros:** Faster local setup, zero-friction shared package modifications, and atomic monorepo commits.
* **Cons:** Larger local folder size, and strict discipline is required to maintain import boundaries.
